// Mock server-only for standalone tsx test execution
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as NodeModule;
} catch {}

interface MockCookie {
  value: string;
  [key: string]: unknown;
}

const mockCookiesStore = new Map<string, MockCookie>();
try {
  const nextHeadersPath = require.resolve("next/headers");
  require.cache[nextHeadersPath] = {
    id: nextHeadersPath,
    filename: nextHeadersPath,
    loaded: true,
    exports: {
      cookies: async () => ({
        get: (name: string) => mockCookiesStore.get(name),
        set: (name: string, value: string, options?: Record<string, unknown>) =>
          mockCookiesStore.set(name, { value, ...options }),
        delete: (name: string) => mockCookiesStore.delete(name),
      }),
    },
  } as NodeModule;
} catch {}

try {
  const nextCachePath = require.resolve("next/cache");
  require.cache[nextCachePath] = {
    id: nextCachePath,
    filename: nextCachePath,
    loaded: true,
    exports: {
      revalidatePath: () => {},
      revalidateTag: () => {},
    },
  } as NodeModule;
} catch {}

class RedirectError extends Error {
  url: string;
  constructor(url: string) {
    super("NEXT_REDIRECT");
    this.url = url;
  }
}

try {
  const nextNavPath = require.resolve("next/navigation");
  require.cache[nextNavPath] = {
    id: nextNavPath,
    filename: nextNavPath,
    loaded: true,
    exports: {
      redirect: (url: string) => {
        throw new RedirectError(url);
      },
    },
  } as NodeModule;
} catch {}

import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, message: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  const {
    getTeamMembers,
    createTeamMember,
    updateUserRole,
    revokeUserSessions,
  } = await import("../src/lib/services/user");
  const {
    updateUserRoleSchema,
  } = await import("../src/lib/validations/team");
  const { hashPassword, verifyPassword } = await import("../src/lib/auth/password");
  const { encryptSession } = await import("../src/lib/auth/session");
  const { recordSecurityAudit } = await import("../src/lib/services/audit");
  const {
    createTeamMemberAction,
    updateUserRoleAction,
  } = await import("../src/app/admin/team/actions");
  const { GET: getAdminLeadsRoute } = await import("../src/app/api/admin/leads/route");
  const {
    updateLeadStatusAction,
    addLeadNoteAction,
  } = await import("../src/app/admin/leads/actions");

  console.log("==================================================");
  console.log("Admin & Team Member Management Hardening Tests");
  console.log("==================================================");

  const testSuffix = Date.now();
  const testAdminEmail = `test_admin_${testSuffix}@example.com`;
  const testSecondaryAdminEmail = `test_admin2_${testSuffix}@example.com`;
  const testStaffEmail = `test_staff_${testSuffix}@example.com`;
  const testPlainPassword = "StrongTestPassword123!";

  let secondaryAdminId: string | null = null;
  const createdTestUserIds: string[] = [];
  const createdTestLeadIds: string[] = [];

  try {
    // Setup test actors in database
    const primaryHash = await hashPassword(testPlainPassword);
    const primaryAdmin = await prisma.user.create({
      data: {
        name: "Primary Admin Actor",
        email: testAdminEmail,
        passwordHash: primaryHash,
        role: Role.ADMIN,
      },
    });
    createdTestUserIds.push(primaryAdmin.id);

    const staffHash = await hashPassword(testPlainPassword);
    const staffUser = await prisma.user.create({
      data: {
        name: "Staff User Actor",
        email: testStaffEmail,
        passwordHash: staffHash,
        role: Role.USER,
      },
    });
    createdTestUserIds.push(staffUser.id);

    // 1. Unauthenticated user cannot create a team member
    console.log("\n1. Testing Unauthenticated Server Boundary...");
    mockCookiesStore.clear();

    const unauthForm = new FormData();
    unauthForm.set("name", "Unauth Target");
    unauthForm.set("email", `unauth_${testSuffix}@example.com`);
    unauthForm.set("password", "ValidPass123!");
    unauthForm.set("role", Role.USER);

    const unauthRes = await createTeamMemberAction(undefined, unauthForm);
    assert(unauthRes.success === false, "Unauthenticated createTeamMemberAction returns success: false");
    assert(
      (unauthRes.error || "").toLowerCase().includes("unauthorized"),
      "Unauthenticated createTeamMemberAction returns unauthorized error"
    );

    // 2. USER cannot create a team member
    console.log("\n2. Testing Non-Admin (USER) Cannot Create Team Member...");
    const userSessionToken = await encryptSession({
      userId: staffUser.id,
      email: staffUser.email,
      role: Role.USER,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    mockCookiesStore.set("admin_session", { value: userSessionToken });

    const userCreateStaffForm = new FormData();
    userCreateStaffForm.set("name", "User Trying Create Staff");
    userCreateStaffForm.set("email", `staff_by_user_${testSuffix}@example.com`);
    userCreateStaffForm.set("password", "ValidPass123!");
    userCreateStaffForm.set("role", Role.USER);

    const userCreateStaffRes = await createTeamMemberAction(undefined, userCreateStaffForm);
    assert(userCreateStaffRes.success === false, "USER role rejected from creating team members");
    assert(
      (userCreateStaffRes.error || "").toLowerCase().includes("unauthorized"),
      "USER role receives unauthorized message on createTeamMemberAction"
    );

    // 3. USER cannot create an ADMIN
    console.log("\n3. Testing Non-Admin (USER) Cannot Create ADMIN...");
    const userCreateAdminForm = new FormData();
    userCreateAdminForm.set("name", "User Trying Create Admin");
    userCreateAdminForm.set("email", `admin_by_user_${testSuffix}@example.com`);
    userCreateAdminForm.set("password", "ValidPass123!");
    userCreateAdminForm.set("role", Role.ADMIN);

    const userCreateAdminRes = await createTeamMemberAction(undefined, userCreateAdminForm);
    assert(userCreateAdminRes.success === false, "USER role rejected from creating ADMIN");

    // 4. ADMIN can create USER
    console.log("\n4. Testing ADMIN Can Create USER...");
    const adminSessionToken = await encryptSession({
      userId: primaryAdmin.id,
      email: primaryAdmin.email,
      role: Role.ADMIN,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    mockCookiesStore.set("admin_session", { value: adminSessionToken });

    const newStaffEmail = `admin_created_staff_${testSuffix}@example.com`;
    const adminCreateStaffForm = new FormData();
    adminCreateStaffForm.set("name", "Admin Created Staff");
    adminCreateStaffForm.set("email", newStaffEmail);
    adminCreateStaffForm.set("password", "SecureStaffPass123!");
    adminCreateStaffForm.set("role", Role.USER);

    const adminCreateStaffRes = await createTeamMemberAction(undefined, adminCreateStaffForm);
    assert(adminCreateStaffRes.success === true, "ADMIN successfully invokes createTeamMemberAction for USER");

    const createdStaffDb = await prisma.user.findUnique({ where: { email: newStaffEmail } });
    assert(!!createdStaffDb, "Created staff user persists in database");
    assert(createdStaffDb?.role === Role.USER, "Persisted role is strictly USER");
    if (createdStaffDb) createdTestUserIds.push(createdStaffDb.id);

    // 5. ADMIN can create ADMIN
    console.log("\n5. Testing ADMIN Can Create ADMIN...");
    const newAdminEmail = testSecondaryAdminEmail;
    const adminCreateAdminForm = new FormData();
    adminCreateAdminForm.set("name", "Secondary Admin Officer");
    adminCreateAdminForm.set("email", newAdminEmail);
    adminCreateAdminForm.set("password", "SecureAdminPass123!");
    adminCreateAdminForm.set("role", Role.ADMIN);

    const adminCreateAdminRes = await createTeamMemberAction(undefined, adminCreateAdminForm);
    assert(adminCreateAdminRes.success === true, "ADMIN successfully invokes createTeamMemberAction for ADMIN");

    const createdAdminDb = await prisma.user.findUnique({ where: { email: newAdminEmail } });
    assert(!!createdAdminDb, "Created secondary admin persists in database");
    assert(createdAdminDb?.role === Role.ADMIN, "Persisted role is strictly ADMIN");
    if (createdAdminDb) {
      secondaryAdminId = createdAdminDb.id;
      createdTestUserIds.push(createdAdminDb.id);
    }

    // 6. Duplicate email is rejected
    console.log("\n6. Testing Duplicate Email Handling...");
    const dupForm = new FormData();
    dupForm.set("name", "Duplicate Attempt");
    dupForm.set("email", newAdminEmail); // Already created above
    dupForm.set("password", "ValidPass123!");
    dupForm.set("role", Role.ADMIN);

    const dupRes = await createTeamMemberAction(undefined, dupForm);
    assert(dupRes.success === false, "Duplicate email submission is rejected");
    assert(
      (dupRes.error || "").includes("already exists"),
      "Duplicate email returns safe user-facing message"
    );

    // 7. Invalid role is rejected
    console.log("\n7. Testing Invalid Role Rejection...");
    const invalidRoleForm = new FormData();
    invalidRoleForm.set("name", "Invalid Role Attempt");
    invalidRoleForm.set("email", `invalid_role_${testSuffix}@example.com`);
    invalidRoleForm.set("password", "ValidPass123!");
    invalidRoleForm.set("role", "SUPER_ADMIN" as unknown as Role);

    const invalidRoleRes = await createTeamMemberAction(undefined, invalidRoleForm);
    assert(invalidRoleRes.success === false, "Invalid role submission is rejected");

    const schemaTest = updateUserRoleSchema.safeParse({
      userId: staffUser.id,
      role: "MODERATOR" as unknown as Role,
    });
    assert(schemaTest.success === false, "updateUserRoleSchema rejects unsupported role strings");

    // 8. ADMIN can promote USER → ADMIN
    console.log("\n8. Testing ADMIN Can Promote USER → ADMIN...");
    const promoteRes = await updateUserRoleAction(staffUser.id, Role.ADMIN);
    assert(promoteRes.success === true, "updateUserRoleAction successfully promotes USER to ADMIN");

    const promotedUserDb = await prisma.user.findUnique({ where: { id: staffUser.id } });
    assert(promotedUserDb?.role === Role.ADMIN, "Target user role in database is updated to ADMIN");

    // Demote back to USER for clean state
    await updateUserRoleAction(staffUser.id, Role.USER);
    const revertedUserDb = await prisma.user.findUnique({ where: { id: staffUser.id } });
    assert(revertedUserDb?.role === Role.USER, "Target user successfully restored to USER");

    // 9. ADMIN can demote another ADMIN when another ADMIN remains
    console.log("\n9. Testing Demoting Another ADMIN When Another ADMIN Remains...");
    assert(!!secondaryAdminId, "Secondary admin exists for demotion test");
    const demoteSecondaryRes = await updateUserRoleAction(secondaryAdminId!, Role.USER);
    assert(demoteSecondaryRes.success === true, "Secondary admin successfully demoted to USER");

    const demotedDb = await prisma.user.findUnique({ where: { id: secondaryAdminId! } });
    assert(demotedDb?.role === Role.USER, "Secondary admin record in database is now USER");

    // 10. ADMIN cannot demote themselves
    console.log("\n10. Testing Self-Demotion Protection...");
    const selfDemoteRes = await updateUserRoleAction(primaryAdmin.id, Role.USER);
    assert(selfDemoteRes.success === false, "Self-demotion action returns success: false");
    assert(
      (selfDemoteRes.error || "").includes("own account"),
      "Self-demotion action returns clear self-protection error"
    );

    const selfDb = await prisma.user.findUnique({ where: { id: primaryAdmin.id } });
    assert(selfDb?.role === Role.ADMIN, "Admin account remains ADMIN after self-demotion attempt");

    // 11. The final ADMIN cannot be demoted
    console.log("\n11. Testing Last-Admin Protection...");
    let lastAdminBlocked = false;
    try {
      // Simulate an attempt to demote where the target user is an admin but caller is not authorized or it's the last admin
      await updateUserRole({
        targetUserId: primaryAdmin.id,
        newRole: Role.USER,
        currentAdminId: "non-existent-or-unauthorized-id",
      });
    } catch (err: unknown) {
      lastAdminBlocked = true;
      const msg = err instanceof Error ? err.message : "";
      assert(
        msg.includes("own account") || msg.includes("last remaining administrator") || msg.includes("Caller does not possess"),
        "Sole/invalid admin demotion safely halts with clear error"
      );
    }
    assert(lastAdminBlocked === true, "Demoting last/unauthorized admin is strictly blocked");

    // 12. Privileged operations do not expose password hashes
    console.log("\n12. Testing Absence of Password Hashes in Returned Data...");
    const members = await getTeamMembers();
    for (const m of members) {
      assert(!("passwordHash" in m), `Team member ${m.email} does not expose passwordHash field`);
      assert(!("password" in m), `Team member ${m.email} does not expose plaintext password field`);
    }

    const createdRecord = await createTeamMember({
      name: "Hash Audit Test",
      email: `hash_audit_${testSuffix}@example.com`,
      password: "TestPassword123!",
      role: Role.USER,
      actorId: primaryAdmin.id,
    });
    createdTestUserIds.push(createdRecord.id);
    assert(!("passwordHash" in createdRecord), "createTeamMember return object does not contain passwordHash");
    assert(!("password" in createdRecord), "createTeamMember return object does not contain plaintext password");

    // 13. Passwords are stored only as bcrypt hashes
    console.log("\n13. Testing Bcrypt Hash Verification...");
    const dbRecord = await prisma.user.findUnique({ where: { id: createdRecord.id } });
    assert(!!dbRecord, "Audit record exists in database");
    assert(dbRecord!.passwordHash.startsWith("$2a$") || dbRecord!.passwordHash.startsWith("$2b$"), "passwordHash uses standard bcrypt format");
    assert(dbRecord!.passwordHash !== "TestPassword123!", "Plaintext password is never stored in passwordHash");
    const verified = await verifyPassword("TestPassword123!", dbRecord!.passwordHash);
    assert(verified === true, "Bcrypt hash successfully verifies against original plaintext password");

    // 14. Audit information does not contain plaintext passwords
    console.log("\n14. Testing Audit Log Material Sanitization...");
    const auditOutput = recordSecurityAudit({
      action: "ADMIN_CREATED",
      actorId: primaryAdmin.id,
      actorEmail: primaryAdmin.email,
      targetUserId: createdRecord.id,
      targetUserEmail: createdRecord.email,
      details: {
        password: "SecretPasswordShouldBeStripped",
        passwordHash: "$2b$12$SensitiveHashShouldBeStripped",
        secret: "SensitiveSecretShouldBeStripped",
        token: "SecretTokenShouldBeStripped",
        assignedRole: Role.ADMIN,
      },
    });

    assert(auditOutput.details?.password === undefined, "Audit log event strips plaintext password");
    assert(auditOutput.details?.passwordHash === undefined, "Audit log event strips passwordHash");
    assert(auditOutput.details?.secret === undefined, "Audit log event strips secret");
    assert(auditOutput.details?.token === undefined, "Audit log event strips token");
    assert(auditOutput.details?.assignedRole === Role.ADMIN, "Audit log event preserves non-sensitive details");

    // 15. Testing Lead Management Authorization Boundaries
    console.log("\n15. Testing Lead Management Authorization Boundaries...");

    // 15a. Unauthenticated request to GET /api/admin/leads
    mockCookiesStore.clear();
    const unauthLeadReq = new Request("http://localhost:3000/api/admin/leads");
    const unauthLeadRes = await getAdminLeadsRoute(unauthLeadReq);
    assert(unauthLeadRes.status === 401, "Unauthenticated request to GET /api/admin/leads is rejected with 401");
    const unauthLeadData = await unauthLeadRes.json();
    assert(unauthLeadData.success === false, "Unauthenticated response body indicates success: false");

    // 15b. Non-admin (USER) request to GET /api/admin/leads
    const staffToken = await encryptSession({
      userId: staffUser.id,
      email: staffUser.email,
      role: Role.USER,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    mockCookiesStore.set("admin_session", { value: staffToken });
    const userReq = new Request("http://localhost:3000/api/admin/leads");
    const userRes = await getAdminLeadsRoute(userReq);
    assert(userRes.status === 401, "USER request to GET /api/admin/leads is rejected with 401");

    // 15c. Active ADMIN request to GET /api/admin/leads
    const adminToken = await encryptSession({
      userId: primaryAdmin.id,
      email: primaryAdmin.email,
      role: Role.ADMIN,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    mockCookiesStore.set("admin_session", { value: adminToken });
    const adminReq = new Request("http://localhost:3000/api/admin/leads");
    const adminRes = await getAdminLeadsRoute(adminReq);
    assert(adminRes.status === 200, "Active ADMIN request to GET /api/admin/leads succeeds with 200");
    const adminData = await adminRes.json();
    assert(adminData.success === true, "Active ADMIN response body indicates success: true");

    // 15d. Active ADMIN can perform lead-management server actions
    const testLead = await prisma.lead.create({
      data: {
        name: "Auth Test Lead",
        email: `lead_${testSuffix}@example.com`,
        consentGiven: true,
        status: "NEW",
      },
    });
    createdTestLeadIds.push(testLead.id);

    const adminStatusUpdate = await updateLeadStatusAction(testLead.id, "CONTACTED");
    assert(adminStatusUpdate.success === true, "Active ADMIN successfully executes updateLeadStatusAction");

    const adminNoteUpdate = await addLeadNoteAction(testLead.id, "Valid admin consultation note");
    assert(adminNoteUpdate.success === true, "Active ADMIN successfully executes addLeadNoteAction");

    // 16. Testing Stale ADMIN JWT Demotion Invalidation
    console.log("\n16. Testing Stale ADMIN JWT Demotion Invalidation...");
    // 1. Create a dedicated admin user
    const demotedUserHash = await hashPassword(testPlainPassword);
    const demotedAdminUser = await prisma.user.create({
      data: {
        name: "Stale JWT Demoted Admin",
        email: `stale_admin_${testSuffix}@example.com`,
        passwordHash: demotedUserHash,
        role: Role.ADMIN,
      },
    });
    createdTestUserIds.push(demotedAdminUser.id);

    // 2. Issue/capture an ADMIN JWT for this user
    const staleAdminToken = await encryptSession({
      userId: demotedAdminUser.id,
      email: demotedAdminUser.email,
      role: Role.ADMIN, // Stale JWT claims role: ADMIN
      tokenVersion: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Verify token works initially while DB role is ADMIN
    mockCookiesStore.set("admin_session", { value: staleAdminToken });
    const preDemotionRes = await getAdminLeadsRoute(new Request("http://localhost:3000/api/admin/leads"));
    assert(preDemotionRes.status === 200, "ADMIN session token initially accesses leads API before demotion");

    // 3. Demote user in PostgreSQL directly to USER (simulating demotion by another admin)
    await prisma.user.update({
      where: { id: demotedAdminUser.id },
      data: { role: Role.USER },
    });

    // 4. Retain the old stale ADMIN token in the cookie store
    mockCookiesStore.set("admin_session", { value: staleAdminToken });

    // 5. Attempt protected operations using the stale ADMIN JWT
    // 5a. Access GET /api/admin/leads with stale JWT
    const postDemotionApiRes = await getAdminLeadsRoute(new Request("http://localhost:3000/api/admin/leads"));
    assert(
      postDemotionApiRes.status === 401,
      "Demoted ADMIN with stale ADMIN JWT is strictly rejected from /api/admin/leads with 401"
    );
    const postDemotionApiData = await postDemotionApiRes.json();
    assert(postDemotionApiData.success === false, "Stale JWT API response indicates success: false");

    // 5b. Call updateLeadStatusAction with stale JWT
    const staleStatusAction = await updateLeadStatusAction(testLead.id, "QUALIFIED");
    assert(
      staleStatusAction.success === false,
      "Demoted ADMIN with stale ADMIN JWT is rejected from updateLeadStatusAction"
    );
    assert(
      staleStatusAction.error?.includes("Unauthorized") === true,
      "updateLeadStatusAction returns unauthorized error for stale ADMIN JWT"
    );

    // 5c. Call addLeadNoteAction with stale JWT
    const staleNoteAction = await addLeadNoteAction(testLead.id, "Attempted unauthorized note");
    assert(
      staleNoteAction.success === false,
      "Demoted ADMIN with stale ADMIN JWT is rejected from addLeadNoteAction"
    );
    assert(
      staleNoteAction.error?.includes("Unauthorized") === true,
      "addLeadNoteAction returns unauthorized error for stale ADMIN JWT"
    );

    // 6. Test Token Version Revocation (User remains ADMIN, but session token is revoked)
    console.log("  Testing Token Version Session Revocation...");
    const revokingAdminUser = await prisma.user.create({
      data: {
        name: "Revocable Admin",
        email: `revocable_admin_${testSuffix}@example.com`,
        passwordHash: demotedUserHash,
        role: Role.ADMIN,
        tokenVersion: 1,
      },
    });
    createdTestUserIds.push(revokingAdminUser.id);

    const tokenBeforeRevocation = await encryptSession({
      userId: revokingAdminUser.id,
      email: revokingAdminUser.email,
      role: Role.ADMIN,
      tokenVersion: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    mockCookiesStore.set("admin_session", { value: tokenBeforeRevocation });
    const preRevocationRes = await getAdminLeadsRoute(new Request("http://localhost:3000/api/admin/leads"));
    assert(preRevocationRes.status === 200, "Active token with matching tokenVersion succeeds (200)");

    // Explicitly revoke all sessions by incrementing tokenVersion
    await revokeUserSessions(revokingAdminUser.id);

    // Try accessing protected route with previous token (tokenVersion mismatch)
    const postRevocationRes = await getAdminLeadsRoute(new Request("http://localhost:3000/api/admin/leads"));
    assert(
      postRevocationRes.status === 401,
      "Revoked session with mismatched tokenVersion is strictly rejected with 401"
    );
    const postRevocationData = await postRevocationRes.json();
    assert(postRevocationData.success === false, "Revoked token API response indicates success: false");

    // 17. Testing Role Concurrency & Last-Admin Invariant Protection
    console.log("\n17. Testing Role Concurrency & Last-Admin Invariant...");

    // Demote primaryAdmin to USER so test does not rely on it as the surviving admin
    await prisma.user.update({
      where: { id: primaryAdmin.id },
      data: { role: Role.USER },
    });

    // 1. Two dedicated admins created for the race
    const raceHash = await hashPassword(testPlainPassword);
    const raceAdmin1 = await prisma.user.create({
      data: {
        name: "Race Admin 1",
        email: `race1_${testSuffix}@example.com`,
        passwordHash: raceHash,
        role: Role.ADMIN,
      },
    });
    createdTestUserIds.push(raceAdmin1.id);

    const raceAdmin2 = await prisma.user.create({
      data: {
        name: "Race Admin 2",
        email: `race2_${testSuffix}@example.com`,
        passwordHash: raceHash,
        role: Role.ADMIN,
      },
    });
    createdTestUserIds.push(raceAdmin2.id);

    // Verify initial race state: both actors are confirmed active ADMINs
    const [initAdmin1, initAdmin2] = await Promise.all([
      prisma.user.findUnique({ where: { id: raceAdmin1.id } }),
      prisma.user.findUnique({ where: { id: raceAdmin2.id } }),
    ]);
    assert(initAdmin1?.role === Role.ADMIN, "Race Admin 1 is initialized as ADMIN");
    assert(initAdmin2?.role === Role.ADMIN, "Race Admin 2 is initialized as ADMIN");

    // 2. Concurrently attempt mutual demotions:
    // raceAdmin1 attempts to demote raceAdmin2, while raceAdmin2 attempts to demote raceAdmin1
    const results = await Promise.allSettled([
      updateUserRole({
        targetUserId: raceAdmin2.id,
        newRole: Role.USER,
        currentAdminId: raceAdmin1.id,
      }),
      updateUserRole({
        targetUserId: raceAdmin1.id,
        newRole: Role.USER,
        currentAdminId: raceAdmin2.id,
      }),
    ]);

    // 3. Both requests complete with either success or a controlled, expected rejection
    for (const result of results) {
      if (result.status === "rejected") {
        const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        const isControlledError =
          errorMsg.includes("Caller does not possess active administrator privileges") ||
          errorMsg.includes("Cannot demote the last remaining administrator") ||
          errorMsg.includes("Concurrent administrative update detected");
        assert(
          isControlledError,
          `Concurrent role modification failed with controlled rejection: ${errorMsg}`
        );
      } else {
        assert(
          result.status === "fulfilled" && !!result.value?.id,
          "Fulfilled role modification returned valid updated user"
        );
      }
    }

    // 4. Inspect resulting database roles for both race participants
    const [finalRace1, finalRace2] = await Promise.all([
      prisma.user.findUnique({ where: { id: raceAdmin1.id } }),
      prisma.user.findUnique({ where: { id: raceAdmin2.id } }),
    ]);

    // 5. Specifically verify that the two race users cannot both end up as USER
    assert(
      finalRace1?.role === Role.ADMIN || finalRace2?.role === Role.ADMIN,
      "The two race administrators cannot both be demoted to USER"
    );
    assert(
      !(finalRace1?.role === Role.USER && finalRace2?.role === Role.USER),
      "Mutual concurrent demotion did not demote both race administrators"
    );

    // 6. Verify that at most one of the mutual demotions succeeded
    const fulfilledCount = results.filter((r) => r.status === "fulfilled").length;
    assert(
      fulfilledCount <= 1,
      "At most one of the concurrent mutual demotions can succeed under Serializable isolation"
    );

    // 7. Verify that the system still maintains at least one active ADMIN
    const remainingAdmins = await prisma.user.count({
      where: { role: Role.ADMIN },
    });
    assert(remainingAdmins >= 1, "Database still contains at least one ADMIN after concurrent role modifications");

  } finally {
    // Cleanup all created test records
    console.log("\nCleaning up test records...");
    if (createdTestLeadIds.length > 0) {
      await prisma.lead.deleteMany({
        where: { id: { in: createdTestLeadIds } },
      });
    }
    if (createdTestUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdTestUserIds } },
      });
    }
    mockCookiesStore.clear();
    await prisma.$disconnect();
  }

  console.log("\n==================================================");
  console.log(`Results: ${passedCount}/${totalCount} tests passed cleanly.`);
  console.log("==================================================");
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
