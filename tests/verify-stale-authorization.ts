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
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

let passed = 0;
let total = 0;
const results: { name: string; status: "PASS" | "FAIL"; detail?: string }[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  total++;
  if (condition) {
    passed++;
    results.push({ name: testName, status: "PASS" });
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    results.push({ name: testName, status: "FAIL", detail });
    console.error(`  ✗ [FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
  }
}

async function runVerification() {
  const { encryptSession } = await import("../src/lib/auth/session");
  const { getAuthenticatedAdmin, getAuthenticatedUser } = await import("../src/lib/dal");
  const { hashPassword } = await import("../src/lib/auth/password");
  const { revokeUserSessions } = await import("../src/lib/services/user");
  const { GET: getAdminLeadsRoute } = await import("../src/app/api/admin/leads/route");
  const { updateLeadStatusAction } = await import("../src/app/admin/leads/actions");
  const proxyModule = await import("../src/proxy");
  const proxy = proxyModule.default;
  const AdminDashboardPageModule = await import("../src/app/admin/dashboard/page");
  const AdminDashboardPage = AdminDashboardPageModule.default;

  const testSuffix = Date.now().toString();
  const createdUserIds: string[] = [];
  let testLeadId: string | null = null;

  try {
    console.log("===============================================================");
    console.log("FOCUSED SECURITY VERIFICATION: TOKENVERSION & STALE ROLE AUTH");
    console.log("===============================================================");

    // Create a dummy lead for server action testing
    const testLead = await prisma.lead.create({
      data: {
        name: "Security Verification Lead",
        email: `lead_${testSuffix}@example.com`,
        consentGiven: true,
        status: "NEW",
      },
    });
    testLeadId = testLead.id;

    // =========================================================================
    // SCENARIO 1: The Exact Attack Scenario (ADMIN -> USER, tokenVersion 1 -> 2)
    // =========================================================================
    console.log("\n[SCENARIO 1] Testing Exact Attack Scenario: Stale ADMIN -> USER Session...");

    const passwordHash = await hashPassword("TestPassword123!");
    const attackUser = await prisma.user.create({
      data: {
        name: "Attack Scenario Admin",
        email: `attack_admin_${testSuffix}@example.com`,
        passwordHash,
        role: Role.ADMIN,
        tokenVersion: 1,
      },
    });
    createdUserIds.push(attackUser.id);

    // 1. Issue a valid JWT for this admin with tokenVersion = 1, role = ADMIN
    const staleJwt = await encryptSession({
      userId: attackUser.id,
      email: attackUser.email,
      role: Role.ADMIN,
      tokenVersion: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Verify token works initially
    mockCookiesStore.set("admin_session", { value: staleJwt });
    const preCheckAdmin = await getAuthenticatedAdmin();
    assert(preCheckAdmin !== null && preCheckAdmin.id === attackUser.id, "Initial session is valid for ADMIN");

    // 2. Change the database record to: role = USER, tokenVersion = 2 (WITHOUT creating a new session)
    await prisma.user.update({
      where: { id: attackUser.id },
      data: {
        role: Role.USER,
        tokenVersion: 2,
      },
    });

    // 3. Keep the old stale JWT (role = ADMIN, tokenVersion = 1) in cookie store
    mockCookiesStore.set("admin_session", { value: staleJwt });

    // Test 1: getAuthenticatedAdmin()
    const staleAuthAdmin = await getAuthenticatedAdmin();
    assert(staleAuthAdmin === null, "1. getAuthenticatedAdmin() returns null for stale JWT");

    // Test 2: getAuthenticatedUser()
    const staleAuthUser = await getAuthenticatedUser();
    assert(staleAuthUser === null, "2. getAuthenticatedUser() returns null for stale JWT (tokenVersion mismatch)");

    // Test 3: Admin-only Server Action (updateLeadStatusAction)
    const staleActionRes = await updateLeadStatusAction(testLead.id, "QUALIFIED");
    assert(
      staleActionRes.success === false && staleActionRes.error?.includes("Unauthorized") === true,
      "3. Admin-only server action rejects stale JWT with Unauthorized error"
    );

    // Test 4: Admin-only API endpoint (GET /api/admin/leads)
    const staleApiReq = new Request("http://localhost:3000/api/admin/leads");
    const staleApiRes = await getAdminLeadsRoute(staleApiReq);
    assert(staleApiRes.status === 401, "4. Admin-only API route returns 401 Unauthorized for stale JWT");
    const staleApiData = await staleApiRes.json();
    assert(staleApiData.success === false, "4b. API response body contains success: false");

    // Test 5: /admin/* Route (AdminDashboardPage Server Component)
    let pageRedirected = false;
    let pageRedirectUrl = "";
    try {
      await AdminDashboardPage();
    } catch (e: unknown) {
      if (e instanceof RedirectError) {
        pageRedirected = true;
        pageRedirectUrl = e.url;
      }
    }
    assert(pageRedirected === true, "5. AdminDashboardPage redirects unauthenticated/stale user");
    assert(
      pageRedirectUrl.startsWith("/login"),
      `5b. AdminDashboardPage redirects to /login (got: ${pageRedirectUrl})`
    );
    assert(!mockCookiesStore.has("admin_session"), "5c. AdminDashboardPage purges the stale cookie via deleteSession()");

    // Test 6: Stale cookie evaluated against src/proxy.ts
    // Re-set stale cookie to evaluate proxy behavior
    const proxyHeaders = new Headers();
    proxyHeaders.set("cookie", `admin_session=${staleJwt}`);

    // 6a. Proxy on /login
    const proxyLoginReq = new NextRequest("http://localhost:3000/login", { headers: proxyHeaders });
    const proxyLoginRes = await proxy(proxyLoginReq);
    const loginLocation = proxyLoginRes.headers.get("location");
    console.log(`     [Proxy Probe] /login with stale cookie returned: ${proxyLoginRes.status} -> Location: ${loginLocation}`);

    // 6b. Proxy on /admin/dashboard
    const proxyAdminReq = new NextRequest("http://localhost:3000/admin/dashboard", { headers: proxyHeaders });
    const proxyAdminRes = await proxy(proxyAdminReq);
    const adminLocation = proxyAdminRes.headers.get("location");
    console.log(`     [Proxy Probe] /admin/dashboard with stale cookie returned: ${proxyAdminRes.status} (x-middleware-rewrite / pass: ${!adminLocation})`);

    // 6c. Proxy on /api/admin/leads
    const proxyApiReq = new NextRequest("http://localhost:3000/api/admin/leads", { headers: proxyHeaders });
    const proxyApiRes = await proxy(proxyApiReq);
    console.log(`     [Proxy Probe] /api/admin/leads with stale cookie returned status: ${proxyApiRes.status}`);

    // =========================================================================
    // SCENARIO 2: Explicit Session Revocation
    // =========================================================================
    console.log("\n[SCENARIO 2] Testing Explicit Session Revocation (revokeUserSessions)...");

    const revokeUser = await prisma.user.create({
      data: {
        name: "Revocation Test Admin",
        email: `revoke_admin_${testSuffix}@example.com`,
        passwordHash,
        role: Role.ADMIN,
        tokenVersion: 5,
      },
    });
    createdUserIds.push(revokeUser.id);

    const tokenV5 = await encryptSession({
      userId: revokeUser.id,
      email: revokeUser.email,
      role: Role.ADMIN,
      tokenVersion: 5,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    mockCookiesStore.set("admin_session", { value: tokenV5 });
    const preRevokeAdmin = await getAuthenticatedAdmin();
    assert(preRevokeAdmin !== null, "Token with tokenVersion = 5 is initially authenticated");

    // Call revokeUserSessions
    await revokeUserSessions(revokeUser.id);
    const dbUserAfterRevoke = await prisma.user.findUnique({ where: { id: revokeUser.id } });
    assert(
      dbUserAfterRevoke?.tokenVersion === 6,
      `revokeUserSessions incremented database tokenVersion from 5 to 6 (got: ${dbUserAfterRevoke?.tokenVersion})`
    );

    // Old token with tokenVersion = 5 tested against DAL
    mockCookiesStore.set("admin_session", { value: tokenV5 });
    const postRevokeAdmin = await getAuthenticatedAdmin();
    assert(postRevokeAdmin === null, "Old tokenVersion = 5 rejected by getAuthenticatedAdmin() after revocation");

    const postRevokeUser = await getAuthenticatedUser();
    assert(postRevokeUser === null, "Old tokenVersion = 5 rejected by getAuthenticatedUser() after revocation");

    const postRevokeApi = await getAdminLeadsRoute(new Request("http://localhost:3000/api/admin/leads"));
    assert(postRevokeApi.status === 401, "API endpoint returns 401 for revoked session");

    // =========================================================================
    // SCENARIO 3: User Promoted from USER to ADMIN (Database Role Authority)
    // =========================================================================
    console.log("\n[SCENARIO 3] Testing Role Upgrade: USER -> ADMIN with active tokenVersion...");

    const promoUser = await prisma.user.create({
      data: {
        name: "Promoted Staff",
        email: `promo_user_${testSuffix}@example.com`,
        passwordHash,
        role: Role.USER,
        tokenVersion: 1,
      },
    });
    createdUserIds.push(promoUser.id);

    // Issue JWT with role = USER, tokenVersion = 1
    const userJwt = await encryptSession({
      userId: promoUser.id,
      email: promoUser.email,
      role: Role.USER,
      tokenVersion: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    mockCookiesStore.set("admin_session", { value: userJwt });
    assert((await getAuthenticatedAdmin()) === null, "USER is initially denied admin access");

    // Promote in database to ADMIN keeping tokenVersion = 1
    await prisma.user.update({
      where: { id: promoUser.id },
      data: { role: Role.ADMIN },
    });

    // Check if getAuthenticatedAdmin() respects current database role
    const promoAdmin = await getAuthenticatedAdmin();
    assert(
      promoAdmin !== null && promoAdmin.role === Role.ADMIN,
      "Current database role ADMIN is respected even if old JWT had role = USER (DB is authoritative)"
    );

    // =========================================================================
    // SCENARIO 4: Deleted User Handling
    // =========================================================================
    console.log("\n[SCENARIO 4] Testing Deleted User Rejection...");

    const deleteUser = await prisma.user.create({
      data: {
        name: "Temporary User To Delete",
        email: `delete_user_${testSuffix}@example.com`,
        passwordHash,
        role: Role.ADMIN,
        tokenVersion: 1,
      },
    });

    const deleteUserJwt = await encryptSession({
      userId: deleteUser.id,
      email: deleteUser.email,
      role: Role.ADMIN,
      tokenVersion: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    mockCookiesStore.set("admin_session", { value: deleteUserJwt });
    assert((await getAuthenticatedAdmin()) !== null, "User is valid before deletion");

    // Delete user from DB
    await prisma.user.delete({ where: { id: deleteUser.id } });

    // Verify session rejection
    assert((await getAuthenticatedAdmin()) === null, "Deleted user rejected by getAuthenticatedAdmin()");
    assert((await getAuthenticatedUser()) === null, "Deleted user rejected by getAuthenticatedUser()");

    const deletedApiRes = await getAdminLeadsRoute(new Request("http://localhost:3000/api/admin/leads"));
    assert(deletedApiRes.status === 401, "Deleted user API request rejected with 401");

  } finally {
    // Cleanup
    console.log("\nCleaning up test records from database...");
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    if (testLeadId) {
      await prisma.lead.delete({
        where: { id: testLeadId },
      });
    }
    await prisma.$disconnect();
  }

  console.log("\n===============================================================");
  console.log(`VERIFICATION SUMMARY: ${passed} / ${total} CHECKS PASSED`);
  console.log("===============================================================");
}

runVerification().catch((e) => {
  console.error("FATAL: Verification script threw error:", e);
  process.exit(1);
});
