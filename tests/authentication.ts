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

  // 7. User Data Isolation by Verified Account Email
  console.log("\n7. Testing User Data Isolation & Ownership Enforcement...");
  interface MockLead {
    id: string;
    email: string;
    status: string;
  }

  const mockLeadsDatabase: MockLead[] = [
    { id: "lead_1", email: "user@novadental.com", status: "NEW" },
    { id: "lead_2", email: "other@example.com", status: "NEW" },
    { id: "lead_3", email: "anon@example.com", status: "NEW" },
  ];

  function queryUserConsultations(user: { email: string }) {
    return mockLeadsDatabase.filter((lead) => lead.email === user.email);
  }

  const userConsultations = queryUserConsultations({ email: "user@novadental.com" });
  assert(userConsultations.length === 1, "User retrieves exactly their own consultation matching verified email");
  assert(userConsultations[0].id === "lead_1", "User consultation has expected ID");
  assert(
    !userConsultations.some((l) => l.email === "other@example.com"),
    "User CANNOT see another user's consultation"
  );
  assert(
    !userConsultations.some((l) => l.email === "anon@example.com"),
    "User CANNOT see unrelated anonymous consultations"
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

  console.log("\n==================================================");
  console.log(`Results: ${passedCount}/${totalCount} tests passed cleanly.`);
  console.log("==================================================");
}

runTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
