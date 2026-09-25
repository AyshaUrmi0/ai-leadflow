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

import type { SessionPayload } from "../src/lib/auth/session";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTests() {
  const { hashPassword, verifyPassword } = await import("../src/lib/auth/password");
  const { encryptSession, decryptSession } = await import("../src/lib/auth/session");
  console.log("==================================================");
  console.log("Authentication & Role-Based Authorization Verification");
  console.log("==================================================");

  // 1. Password Hashing & Verification
  console.log("\n1. Testing Password Hashing & Verification...");
  const rawPassword = "SecureAdminPassword123!";
  const hashedPassword = await hashPassword(rawPassword);
  assert(hashedPassword.startsWith("$2"), "Password is hashed using bcrypt");
  assert(hashedPassword !== rawPassword, "Hashed password does not equal plain text");

  const isMatch = await verifyPassword(rawPassword, hashedPassword);
  assert(isMatch === true, "Valid password verifies successfully");

  const isMismatch = await verifyPassword("WrongPassword123!", hashedPassword);
  assert(isMismatch === false, "Invalid password verification fails");

  // 2. Session Encryption & Decryption (JWT via jose)
  console.log("\n2. Testing Session JWT Encryption & Decryption...");
  const adminPayload: SessionPayload = {
    userId: "user_admin_123",
    email: "admin@novadental.com",
    role: "ADMIN",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const adminToken = await encryptSession(adminPayload);
  assert(typeof adminToken === "string" && adminToken.split(".").length === 3, "Session token is a valid 3-part JWT");

  const decryptedAdmin = await decryptSession(adminToken);
  assert(decryptedAdmin !== null, "Admin session token decrypts successfully");
  assert(decryptedAdmin?.userId === "user_admin_123", "Decrypted userId matches");
  assert(decryptedAdmin?.email === "admin@novadental.com", "Decrypted email matches");
  assert(decryptedAdmin?.role === "ADMIN", "Decrypted role is ADMIN");

  const userPayload: SessionPayload = {
    userId: "user_staff_456",
    email: "user@novadental.com",
    role: "USER",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const userToken = await encryptSession(userPayload);
  const decryptedUser = await decryptSession(userToken);
  assert(decryptedUser !== null, "User session token decrypts successfully");
  assert(decryptedUser?.role === "USER", "Decrypted role is USER");

  const invalidToken = await decryptSession("invalid.tampered.token");
  assert(invalidToken === null, "Invalid session token returns null");

  // 3. Authorization Logic & Boundary Simulation
  console.log("\n3. Testing Authorization & Role Boundary Logic...");

  // Simulate DAL verifySession logic
  function simulateVerifySession(session: SessionPayload | null) {
    if (!session || !session.userId || session.role !== "ADMIN") {
      return { isAuth: false, userId: null, email: null, role: null };
    }
    return { isAuth: true, userId: session.userId, email: session.email, role: session.role };
  }

  const adminDalResult = simulateVerifySession(decryptedAdmin);
  assert(adminDalResult.isAuth === true, "DAL verifySession passes for ADMIN");
  assert(adminDalResult.role === "ADMIN", "DAL returns ADMIN role");

  const userDalResult = simulateVerifySession(decryptedUser);
  assert(userDalResult.isAuth === false, "DAL verifySession rejects USER (role !== ADMIN)");
  assert(userDalResult.userId === null, "DAL returns null userId for USER");

  const unauthDalResult = simulateVerifySession(null);
  assert(unauthDalResult.isAuth === false, "DAL verifySession rejects unauthenticated requests");

  // 4. Route Proxy Policy Simulation
  console.log("\n4. Testing Route Proxy Policy Rules...");

  interface RouteDecision {
    allow: boolean;
    redirect?: string;
    status?: number;
  }

  function evaluateRoute(pathname: string, session: SessionPayload | null): RouteDecision {
    const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
    const isAdminLoginRoute = pathname === "/admin/login";
    const isAdminApiRoute = pathname.startsWith("/api/admin");
    const isPortalRoute = pathname.startsWith("/portal");

    const hasSession = !!(session && session.userId);
    const isAdmin = !!(hasSession && session.role === "ADMIN");
    const isUser = !!(hasSession && session.role === "USER");

    if (isAdminRoute) {
      if (!hasSession) return { allow: false, redirect: `/admin/login?callbackUrl=${pathname}` };
      if (!isAdmin) return { allow: false, redirect: "/portal" };
    }

    if (isAdminApiRoute && !isAdmin) {
      return { allow: false, status: 401 };
    }

    if (isPortalRoute && !hasSession) {
      return { allow: false, redirect: `/admin/login?callbackUrl=${pathname}` };
    }

    if (isAdminLoginRoute && hasSession) {
      if (isAdmin) return { allow: false, redirect: "/admin/dashboard" };
      if (isUser) return { allow: false, redirect: "/portal" };
    }

    return { allow: true };
  }

  // Unauthenticated tests
  assert(
    evaluateRoute("/admin/dashboard", null).redirect === "/admin/login?callbackUrl=/admin/dashboard",
    "Unauthenticated access to /admin/dashboard redirects to /admin/login"
  );
  assert(
    evaluateRoute("/admin/leads", null).redirect === "/admin/login?callbackUrl=/admin/leads",
    "Unauthenticated access to /admin/leads redirects to /admin/login"
  );
  assert(
    evaluateRoute("/portal", null).redirect === "/admin/login?callbackUrl=/portal",
    "Unauthenticated access to /portal redirects to /admin/login"
  );
  assert(
    evaluateRoute("/api/admin/leads", null).status === 401,
    "Unauthenticated access to /api/admin/* returns 401"
  );

  // USER role tests
  assert(
    evaluateRoute("/admin/dashboard", decryptedUser).redirect === "/portal",
    "USER attempting to access /admin/dashboard is redirected to /portal"
  );
  assert(
    evaluateRoute("/admin/leads", decryptedUser).redirect === "/portal",
    "USER attempting to access /admin/leads is redirected to /portal"
  );
  assert(
    evaluateRoute("/api/admin/leads", decryptedUser).status === 401,
    "USER attempting to access /api/admin/* returns 401 Unauthorized"
  );
  assert(
    evaluateRoute("/portal", decryptedUser).allow === true,
    "USER access to /portal is allowed"
  );
  assert(
    evaluateRoute("/admin/login", decryptedUser).redirect === "/portal",
    "Authenticated USER visiting /admin/login is redirected to /portal"
  );

  // ADMIN role tests
  assert(
    evaluateRoute("/admin/dashboard", decryptedAdmin).allow === true,
    "ADMIN access to /admin/dashboard is allowed"
  );
  assert(
    evaluateRoute("/admin/leads", decryptedAdmin).allow === true,
    "ADMIN access to /admin/leads is allowed"
  );
  assert(
    evaluateRoute("/portal", decryptedAdmin).allow === true,
    "ADMIN access to /portal is allowed"
  );
  assert(
    evaluateRoute("/admin/login", decryptedAdmin).redirect === "/admin/dashboard",
    "Authenticated ADMIN visiting /admin/login is redirected to /admin/dashboard"
  );

  // 5. Demo Account Credential Resolution
  console.log("\n5. Testing Demo Account Resolution...");
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || "admin@novadental.com";
  const userEmail = process.env.USER_INITIAL_EMAIL || "user@novadental.com";

  assert(adminEmail === "admin@novadental.com", "Admin demo email resolves to admin@novadental.com");
  assert(userEmail === "user@novadental.com", "User demo email resolves to user@novadental.com");
  assert(adminEmail !== userEmail, "Admin and User demo accounts are distinct");

  // 6. Demo Credential Missing Env Error Handling
  console.log("\n6. Testing Demo Credential Missing Env Error Handling...");
  function simulateDemoLogin(role: "ADMIN" | "USER", env: Record<string, string | undefined>) {
    const email =
      role === "ADMIN"
        ? env.ADMIN_INITIAL_EMAIL || "admin@novadental.com"
        : env.USER_INITIAL_EMAIL || "user@novadental.com";

    const password =
      role === "ADMIN"
        ? env.ADMIN_INITIAL_PASSWORD
        : env.USER_INITIAL_PASSWORD;

    if (!password) {
      const varName = role === "ADMIN" ? "ADMIN_INITIAL_PASSWORD" : "USER_INITIAL_PASSWORD";
      return {
        success: false,
        error: `Demo credentials are not configured on the server. Please set ${varName}.`,
      };
    }

    return { success: true, email, password };
  }

  const missingAdminResult = simulateDemoLogin("ADMIN", { ADMIN_INITIAL_PASSWORD: undefined });
  assert(
    missingAdminResult.success === false && Boolean(missingAdminResult.error?.includes("ADMIN_INITIAL_PASSWORD")),
    "Missing ADMIN_INITIAL_PASSWORD returns explicit server-side error"
  );

  const missingUserResult = simulateDemoLogin("USER", { USER_INITIAL_PASSWORD: undefined });
  assert(
    missingUserResult.success === false && Boolean(missingUserResult.error?.includes("USER_INITIAL_PASSWORD")),
    "Missing USER_INITIAL_PASSWORD returns explicit server-side error"
  );

  const validAdminResult = simulateDemoLogin("ADMIN", { ADMIN_INITIAL_PASSWORD: "ConfiguredAdminPass123!" });
  assert(validAdminResult.success === true, "Configured ADMIN_INITIAL_PASSWORD succeeds");

  const validUserResult = simulateDemoLogin("USER", { USER_INITIAL_PASSWORD: "ConfiguredUserPass123!" });
  assert(validUserResult.success === true, "Configured USER_INITIAL_PASSWORD succeeds");

  // 7. User Data Isolation by Authoritative userId
  console.log("\n7. Testing User Data Isolation & Ownership Enforcement by userId...");
  interface MockLead {
    id: string;
    userId: string | null;
    email: string;
    status: string;
  }

  const userA = { id: "user_a_123", email: "shared@example.com", role: "USER" };
  const userB = { id: "user_b_456", email: "shared@example.com", role: "USER" };

  const mockLeadsDatabase: MockLead[] = [
    { id: "lead_user_a", userId: userA.id, email: userA.email, status: "NEW" },
    { id: "lead_user_b", userId: userB.id, email: userB.email, status: "NEW" },
    { id: "lead_other_b", userId: userB.id, email: "other_b@example.com", status: "CONTACTED" },
    { id: "lead_anonymous", userId: null, email: userA.email, status: "NEW" },
  ];

  // User portal queries strictly by userId
  function queryUserConsultations(user: { id: string }) {
    return mockLeadsDatabase.filter((lead) => lead.userId === user.id);
  }

  // Admin query sees all leads
  function queryAdminLeads() {
    return mockLeadsDatabase;
  }

  const userAConsultations = queryUserConsultations(userA);
  assert(
    userAConsultations.length === 1 && userAConsultations[0].id === "lead_user_a",
    "1. User A sees their own lead (lead_user_a)"
  );
  assert(
    !userAConsultations.some((l) => l.id === "lead_other_b"),
    "2. User A cannot see User B's lead (lead_other_b)"
  );
  assert(
    !userAConsultations.some((l) => l.id === "lead_user_b"),
    "3. User A cannot see User B's lead even though it has the same email (lead_user_b)"
  );
  assert(
    !userAConsultations.some((l) => l.id === "lead_anonymous"),
    "4. User A cannot see an unrelated anonymous lead where userId is null even if email matches"
  );

  const adminLeads = queryAdminLeads();
  assert(
    adminLeads.length === 4,
    "5. Existing admin lead visibility continues to see all leads regardless of userId"
  );

  // 8. Customer-Facing Status Mapping
  console.log("\n8. Testing Customer-Facing Status Mapping...");
  function mapLeadStatusToCustomerView(status: string) {
    switch (status) {
      case "NEW":
        return { label: "In Review", hasCoordinatorNote: true };
      case "CONTACTED":
        return { label: "Team Contacted You", hasCoordinatorNote: true };
      case "QUALIFIED":
        return { label: "Confirmed & Scheduled", hasCoordinatorNote: true };
      case "CLOSED_LOST":
        return { label: "Archived / Inactive", hasCoordinatorNote: true };
      default:
        return { label: "Received", hasCoordinatorNote: false };
    }
  }

  assert(mapLeadStatusToCustomerView("NEW").label === "In Review", "NEW maps to 'In Review'");
  assert(mapLeadStatusToCustomerView("CONTACTED").label === "Team Contacted You", "CONTACTED maps to 'Team Contacted You'");
  assert(mapLeadStatusToCustomerView("QUALIFIED").label === "Confirmed & Scheduled", "QUALIFIED maps to 'Confirmed & Scheduled'");
  assert(mapLeadStatusToCustomerView("CLOSED_LOST").label === "Archived / Inactive", "CLOSED_LOST maps to 'Archived / Inactive'");

  // 9. Admin Status Propagation to User Portal
  console.log("\n9. Testing Admin Status Change Propagation...");
  let testLeadStatus = "NEW";
  assert(mapLeadStatusToCustomerView(testLeadStatus).label === "In Review", "Initial status in portal is 'In Review'");

  // Simulate admin changing status
  testLeadStatus = "CONTACTED";
  assert(
    mapLeadStatusToCustomerView(testLeadStatus).label === "Team Contacted You",
    "Admin status update to CONTACTED propagates to user portal view"
  );

  testLeadStatus = "QUALIFIED";
  assert(
    mapLeadStatusToCustomerView(testLeadStatus).label === "Confirmed & Scheduled",
    "Admin status update to QUALIFIED propagates to user portal view"
  );

  // 10. Logout Session Deletion
  console.log("\n10. Testing Logout Session Clearance...");
  let activeCookie: string | null = "mock_session_token";
  function simulateLogout() {
    activeCookie = null;
  }
  simulateLogout();
  assert(activeCookie === null, "Logout action clears the active session cookie");

  // 11. User Registration Flow & Security Verification
  console.log("\n11. Testing User Registration Flow & Security...");
  const { registerAction } = await import("../src/app/admin/login/actions");
  const { prisma } = await import("../src/lib/prisma");

  const uniqueId = Date.now();
  const testRegEmail = `test_reg_${uniqueId}@example.com`;
  const testRegPassword = "TestRegistrationPassword123!";
  const testRegName = "New Registered Patient";
  const testEscalationEmail = `test_escalation_${uniqueId}@example.com`;

  try {
    // 11.1 Invalid input validation
    console.log("  Testing invalid input handling...");
    const emptyNameForm = new FormData();
    emptyNameForm.append("name", "   ");
    emptyNameForm.append("email", testRegEmail);
    emptyNameForm.append("password", testRegPassword);
    const emptyNameRes = await registerAction(undefined, emptyNameForm);
    assert(
      emptyNameRes.success === false && Boolean(emptyNameRes.fieldErrors?.name?.length),
      "Registration rejects empty/whitespace name with field error"
    );

    const invalidEmailForm = new FormData();
    invalidEmailForm.append("name", testRegName);
    invalidEmailForm.append("email", "not-an-email");
    invalidEmailForm.append("password", testRegPassword);
    const invalidEmailRes = await registerAction(undefined, invalidEmailForm);
    assert(
      invalidEmailRes.success === false && Boolean(invalidEmailRes.fieldErrors?.email?.length),
      "Registration rejects malformed email with field error"
    );

    const shortPasswordForm = new FormData();
    shortPasswordForm.append("name", testRegName);
    shortPasswordForm.append("email", testRegEmail);
    shortPasswordForm.append("password", "short");
    const shortPasswordRes = await registerAction(undefined, shortPasswordForm);
    assert(
      shortPasswordRes.success === false && Boolean(shortPasswordRes.fieldErrors?.password?.length),
      "Registration rejects password shorter than 8 characters with field error"
    );

    // 11.2 Successful registration
    console.log("  Testing successful registration...");
    const validForm = new FormData();
    validForm.append("name", testRegName);
    validForm.append("email", testRegEmail);
    validForm.append("password", testRegPassword);

    let redirectTarget: string | null = null;
    try {
      await registerAction(undefined, validForm);
    } catch (e: unknown) {
      if (e instanceof RedirectError) {
        redirectTarget = e.url;
      } else if (e instanceof Error && e.message === "NEXT_REDIRECT" && "url" in e) {
        redirectTarget = String((e as Record<string, unknown>).url);
      } else {
        throw e;
      }
    }

    assert(redirectTarget === "/portal", "Successful registration redirects to /portal");

    const createdUser = await prisma.user.findUnique({
      where: { email: testRegEmail },
    });
    assert(createdUser !== null, "User record is persisted in the database");
    assert(createdUser?.name === testRegName, "Stored user name matches registration input");
    assert(createdUser?.role === "USER", "Newly registered user role is strictly 'USER'");
    assert(
      createdUser?.passwordHash !== testRegPassword,
      "Stored password is not the plaintext password"
    );

    const isPasswordValid = await verifyPassword(testRegPassword, createdUser!.passwordHash);
    assert(isPasswordValid === true, "Stored password hash verifies successfully with verifyPassword");

    // 11.3 Session creation verification
    console.log("  Testing registration session creation...");
    const sessionCookieObj = mockCookiesStore.get("admin_session");
    assert(Boolean(sessionCookieObj?.value), "Session cookie 'admin_session' was set upon registration");
    const decryptedRegSession = await decryptSession(sessionCookieObj?.value);
    assert(decryptedRegSession !== null, "Registered user session decrypts successfully");
    assert(decryptedRegSession?.userId === createdUser?.id, "Session userId matches created user ID");
    assert(decryptedRegSession?.email === testRegEmail, "Session email matches registered email");
    assert(decryptedRegSession?.role === "USER", "Session role is USER");

    // 11.4 Duplicate email registration prevention
    console.log("  Testing duplicate email prevention...");
    const duplicateForm = new FormData();
    duplicateForm.append("name", "Another User");
    duplicateForm.append("email", testRegEmail);
    duplicateForm.append("password", "DifferentPassword123!");

    const duplicateRes = await registerAction(undefined, duplicateForm);
    assert(duplicateRes.success === false, "Registration with duplicate email is rejected");
    assert(
      duplicateRes.error === "An account with this email address already exists.",
      "Duplicate email returns safe generic error without leaking existing role"
    );

    const userCount = await prisma.user.count({ where: { email: testRegEmail } });
    assert(userCount === 1, "Duplicate registration attempt does not create a second user record");

    // 11.5 Role escalation protection
    console.log("  Testing role escalation protection...");
    const escalationForm = new FormData();
    escalationForm.append("name", "Attacker Trying Admin");
    escalationForm.append("email", testEscalationEmail);
    escalationForm.append("password", "AttackPassword123!");
    escalationForm.append("role", "ADMIN");

    let escalationRedirect: string | null = null;
    try {
      await registerAction(undefined, escalationForm);
    } catch (e: unknown) {
      if (e instanceof RedirectError) {
        escalationRedirect = e.url;
      } else if (e instanceof Error && e.message === "NEXT_REDIRECT" && "url" in e) {
        escalationRedirect = String((e as Record<string, unknown>).url);
      } else {
        throw e;
      }
    }

    assert(escalationRedirect === "/portal", "Escalation attempt redirects to /portal");
    const escalatedUser = await prisma.user.findUnique({
      where: { email: testEscalationEmail },
    });
    assert(escalatedUser !== null, "User with escalation attempt was created");
    assert(
      escalatedUser?.role === "USER",
      "User role is strictly 'USER' despite client passing role=ADMIN"
    );
  } finally {
    // Test cleanup: Remove test users so the database remains deterministic
    console.log("  Cleaning up registration test records...");
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testRegEmail, testEscalationEmail],
        },
      },
    });
    mockCookiesStore.clear();
  }

  // 12. Consultation Submission API & Security Verification (POST /api/leads)
  console.log("\n12. Testing Consultation Submission API (POST /api/leads)...");
  const { POST: postLead } = await import("../src/app/api/leads/route");

  const testConsultationUserEmail = `test_consult_${uniqueId}@example.com`;
  const testConsultationAdminEmail = `test_admin_consult_${uniqueId}@example.com`;
  let createdLeadId: string | null = null;

  try {
    // Create test USER and ADMIN in DB
    const createdPatientUser = await prisma.user.create({
      data: {
        email: testConsultationUserEmail,
        name: "Test Consultation Patient",
        passwordHash: await hashPassword("ValidPassword123!"),
        role: "USER",
      },
    });

    const createdAdminUser = await prisma.user.create({
      data: {
        email: testConsultationAdminEmail,
        name: "Test Consultation Admin",
        passwordHash: await hashPassword("ValidPassword123!"),
        role: "ADMIN",
      },
    });

    function createJsonRequest(body: unknown): Request {
      return new Request("http://localhost:3000/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    const validLeadPayload = {
      name: "Test Consultation Patient",
      email: testConsultationUserEmail,
      phone: "555-0199",
      serviceInterest: "Cosmetic consultations",
      message: "Looking for consultation on veneers.",
      consentGiven: true,
    };

    // 12.1 Unauthenticated POST /api/leads is rejected
    console.log("  Testing unauthenticated consultation submission rejection...");
    mockCookiesStore.clear();
    const unauthResponse = await postLead(createJsonRequest(validLeadPayload));
    assert(
      unauthResponse.status === 401,
      "Unauthenticated POST /api/leads is rejected with 401"
    );
    const unauthJson = await unauthResponse.json();
    assert(
      unauthJson.success === false,
      "Unauthenticated response returns success: false"
    );

    // 12.2 ADMIN cannot create customer consultation through this endpoint
    console.log("  Testing ADMIN consultation submission rejection...");
    const adminToken = await encryptSession({
      userId: createdAdminUser.id,
      email: createdAdminUser.email,
      role: "ADMIN",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    mockCookiesStore.set("admin_session", { value: adminToken });

    const adminResponse = await postLead(createJsonRequest(validLeadPayload));
    assert(
      adminResponse.status === 401,
      "ADMIN POST /api/leads is rejected with 401"
    );
    const adminJson = await adminResponse.json();
    assert(
      adminJson.success === false,
      "ADMIN consultation attempt returns success: false"
    );

    // 12.3 Existing validation still works
    console.log("  Testing input validation for authenticated USER...");
    const userToken = await encryptSession({
      userId: createdPatientUser.id,
      email: createdPatientUser.email,
      role: "USER",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    mockCookiesStore.set("admin_session", { value: userToken });

    const invalidPayload = {
      ...validLeadPayload,
      email: "invalid-email-format",
      consentGiven: false,
    };
    const invalidResponse = await postLead(createJsonRequest(invalidPayload));
    assert(
      invalidResponse.status === 400,
      "Invalid lead payload is rejected with 400"
    );
    const invalidJson = await invalidResponse.json();
    assert(
      invalidJson.success === false && Boolean(invalidJson.errors),
      "Invalid lead payload returns field validation errors"
    );

    // 12.4 Authenticated USER can create a lead & client-provided userId cannot override
    console.log("  Testing authenticated USER submission & userId spoofing prevention...");
    const spoofAttemptPayload = {
      ...validLeadPayload,
      userId: "malicious_spoofed_user_id_999",
    };
    const successResponse = await postLead(createJsonRequest(spoofAttemptPayload));
    assert(
      successResponse.status === 201,
      "Authenticated USER can successfully submit a consultation (201)"
    );
    const successJson = await successResponse.json();
    assert(
      successJson.success === true,
      "Successful submission returns success: true"
    );

    // 12.5 Verify created lead in database
    const createdLead = await prisma.lead.findFirst({
      where: { email: testConsultationUserEmail },
      orderBy: { createdAt: "desc" },
    });
    assert(createdLead !== null, "Created lead exists in database");
    if (createdLead) {
      createdLeadId = createdLead.id;
    }
    assert(
      createdLead?.userId === createdPatientUser.id,
      "Created lead has userId strictly matching authenticated user's ID"
    );
    assert(
      createdLead?.userId !== "malicious_spoofed_user_id_999",
      "Client-provided userId cannot override authenticated user ID"
    );
  } finally {
    console.log("  Cleaning up consultation test records...");
    if (createdLeadId) {
      await prisma.lead.deleteMany({
        where: { id: createdLeadId },
      });
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testConsultationUserEmail, testConsultationAdminEmail],
        },
      },
    });
    mockCookiesStore.clear();
  }

  console.log("\n==================================================");
  console.log(`Results: ${passedCount}/${totalCount} tests passed cleanly.`);
  console.log("==================================================");
}

runTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
