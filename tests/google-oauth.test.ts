import { describe, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { assert } from "./helpers/assert";

const { mockCookiesStore } = vi.hoisted(() => ({
  mockCookiesStore: new Map<string, { value: string; [key: string]: unknown }>(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => mockCookiesStore.get(name),
    set: (name: string, value: string, options?: Record<string, unknown>) =>
      mockCookiesStore.set(name, { value, ...options }),
    delete: (name: string) => mockCookiesStore.delete(name),
  }),
}));

describe("Google OAuth", () => {
  it("passes every check", async () => {

    const { prisma } = await import("../src/lib/prisma");
    const { decryptSession, encryptSession } = await import("../src/lib/auth/session");
    const {
      isGoogleAuthConfigured,
      getBaseUrl,
      getGoogleAuthUrl,
      handleGoogleUserLogin,
    } = await import("../src/lib/auth/google");
    const { GET: handleGoogleInit } = await import("../src/app/api/auth/google/route");
    const { GET: handleGoogleCallback } = await import("../src/app/api/auth/google/callback/route");

    console.log("==================================================");
    console.log("Phase 11: Google OAuth 2.0 Flow Verification");
    console.log("==================================================");

    const originalClientId = process.env.GOOGLE_CLIENT_ID;
    const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    try {
      // -------------------------------------------------------------------------
      // 1. Google OAuth Configuration Checks
      // -------------------------------------------------------------------------
      console.log("\n1. Testing OAuth Configuration Guard...");
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      assert(isGoogleAuthConfigured() === false, "Returns false when client ID/secret are absent");

      process.env.GOOGLE_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
      assert(isGoogleAuthConfigured() === false, "Returns false when secret is missing");

      process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret-12345";
      assert(isGoogleAuthConfigured() === true, "Returns true when both client ID and secret are set");

      // -------------------------------------------------------------------------
      // 2. Base URL & Auth URL Generation
      // -------------------------------------------------------------------------
      console.log("\n2. Testing OAuth URL Construction & CSRF State...");
      assert(getBaseUrl().includes("localhost"), "Base URL defaults to localhost in test environment");

      const dummyState = "csrf_test_state_abc123";
      const redirectUri = "http://localhost:3000/api/auth/google/callback";
      const authUrlString = getGoogleAuthUrl(dummyState, redirectUri);
      const parsedAuthUrl = new URL(authUrlString);

      assert(parsedAuthUrl.origin === "https://accounts.google.com", "Auth URL targets accounts.google.com");
      assert(parsedAuthUrl.pathname === "/o/oauth2/v2/auth", "Auth URL uses standard v2 endpoint");
      assert(parsedAuthUrl.searchParams.get("client_id") === process.env.GOOGLE_CLIENT_ID, "Contains client_id param");
      assert(parsedAuthUrl.searchParams.get("redirect_uri") === redirectUri, "Contains redirect_uri param");
      assert(parsedAuthUrl.searchParams.get("response_type") === "code", "Uses response_type=code");
      assert(parsedAuthUrl.searchParams.get("state") === dummyState, "Carries CSRF state param");
      assert(
        parsedAuthUrl.searchParams.get("scope") === "openid email profile",
        "Requests openid email and profile scopes"
      );
      assert(parsedAuthUrl.searchParams.get("prompt") === "select_account", "Forces account chooser prompt");

      // -------------------------------------------------------------------------
      // 3. GET /api/auth/google Initiation Route Handler
      // -------------------------------------------------------------------------
      console.log("\n3. Testing GET /api/auth/google (Initiation)...");
      // 3a. When unconfigured
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      const reqUnconfigured = new NextRequest("http://localhost:3000/api/auth/google");
      const resUnconfigured = await handleGoogleInit(reqUnconfigured);
      assert(resUnconfigured.status === 307 || resUnconfigured.status === 302, "Unconfigured request redirects");
      const unconfLocation = resUnconfigured.headers.get("location") || "";
      assert(unconfLocation.includes("/login?error=GoogleAuthNotConfigured"), "Redirects to login with GoogleAuthNotConfigured error");

      // 3b. When configured
      process.env.GOOGLE_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
      process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret-12345";

      const reqConfigured = new NextRequest("http://localhost:3000/api/auth/google?callbackUrl=/portal");
      const resConfigured = await handleGoogleInit(reqConfigured);
      assert(resConfigured.status === 307 || resConfigured.status === 302, "Configured initiation redirects");
      const confLocation = resConfigured.headers.get("location") || "";
      assert(confLocation.startsWith("https://accounts.google.com"), "Redirects to Google consent screen");

      const stateCookie = resConfigured.cookies.get("google_oauth_state");
      assert(Boolean(stateCookie?.value), "Sets google_oauth_state cookie");
      assert(stateCookie!.value.length >= 32, "State cookie has cryptographic length");

      const callbackCookie = resConfigured.cookies.get("google_oauth_callback");
      assert(callbackCookie?.value === "/portal", "Sets google_oauth_callback cookie to /portal");

      // 3c. Open redirect attack prevention on callbackUrl
      const reqMalicious = new NextRequest("http://localhost:3000/api/auth/google?callbackUrl=https://evil.attacker.com");
      const resMalicious = await handleGoogleInit(reqMalicious);
      const safeCallbackCookie = resMalicious.cookies.get("google_oauth_callback");
      assert(safeCallbackCookie?.value === "/portal", "Rejects external URL and falls back safely to /portal");

      // -------------------------------------------------------------------------
      // 4. GET /api/auth/google/callback Route Security Validations
      // -------------------------------------------------------------------------
      console.log("\n4. Testing GET /api/auth/google/callback Security Validations...");
      // 4a. User cancels Google consent dialog
      const reqCancelled = new NextRequest("http://localhost:3000/api/auth/google/callback?error=access_denied");
      const resCancelled = await handleGoogleCallback(reqCancelled);
      const cancelLocation = resCancelled.headers.get("location") || "";
      assert(cancelLocation.includes("/login?error=GoogleAuthFailed"), "Access denied error redirects to login");

      // 4b. Missing code or state
      const reqMissingParams = new NextRequest("http://localhost:3000/api/auth/google/callback");
      const resMissingParams = await handleGoogleCallback(reqMissingParams);
      const missingLocation = resMissingParams.headers.get("location") || "";
      assert(missingLocation.includes("/login?error=InvalidOAuthState"), "Missing code/state rejected with InvalidOAuthState");

      // 4c. CSRF state mismatch
      const reqStateMismatch = new NextRequest("http://localhost:3000/api/auth/google/callback?code=mock_code&state=attack_state", {
        headers: {
          cookie: "google_oauth_state=genuine_state",
        },
      });
      const resStateMismatch = await handleGoogleCallback(reqStateMismatch);
      const mismatchLocation = resStateMismatch.headers.get("location") || "";
      assert(mismatchLocation.includes("/login?error=InvalidOAuthState"), "Mismatched state rejected with InvalidOAuthState");

      // -------------------------------------------------------------------------
      // 5. Database User Creation & Account Linking via handleGoogleUserLogin
      // -------------------------------------------------------------------------
      console.log("\n5. Testing Database User Creation & Account Linking...");
      const testGoogleId = "google_user_test_" + Date.now();
      const testGoogleEmail = `test_google_${Date.now()}@example.com`;

      // 5a. Rejection of unverified email
      let threwUnverified = false;
      try {
        await handleGoogleUserLogin({
          sub: testGoogleId,
          email: testGoogleEmail,
          email_verified: false,
          name: "Unverified User",
        });
      } catch {
        threwUnverified = true;
      }
      assert(threwUnverified, "Throws error for unverified Google account email");

      // 5b. New User Creation with Google Profile
      console.log("  Creating new user via Google profile...");
      const newGoogleUser = await handleGoogleUserLogin({
        sub: testGoogleId,
        email: testGoogleEmail,
        email_verified: true,
        name: "Google Test User",
        picture: "https://lh3.googleusercontent.com/a/test-avatar",
      });

      assert(newGoogleUser.email === testGoogleEmail, "Persists normalized user email");
      assert(newGoogleUser.googleId === testGoogleId, "Persists Google sub ID");
      assert(newGoogleUser.name === "Google Test User", "Persists Google profile display name");
      assert(newGoogleUser.avatarUrl === "https://lh3.googleusercontent.com/a/test-avatar", "Persists Google avatar URL");
      assert(newGoogleUser.role === "USER", "Default role assigned is strictly USER");
      assert(newGoogleUser.passwordHash === null, "passwordHash is null for Google-only registration");
      assert(newGoogleUser.tokenVersion === 1, "Default tokenVersion is initialized to 1");

      // 5c. Repeated Google Login (Idempotent Profile Resolution)
      console.log("  Testing idempotent return on subsequent Google Sign-In...");
      const subsequentUser = await handleGoogleUserLogin({
        sub: testGoogleId,
        email: testGoogleEmail,
        email_verified: true,
        name: "Google Test User",
      });
      assert(subsequentUser.id === newGoogleUser.id, "Existing user record is returned without duplicating");

      // 5d. Account Linking: Existing Password Account Signs In with Google
      console.log("  Testing linking Google account to existing password-registered user...");
      const linkEmail = `existing_pass_${Date.now()}@novadental.com`;
      const createdPassUser = await prisma.user.create({
        data: {
          email: linkEmail,
          name: "Legacy Password Account",
          passwordHash: "$2a$12$e8Y...mockhash",
          role: "USER",
          tokenVersion: 1,
        },
      });

      assert(createdPassUser.googleId === null, "Initial user has no googleId");
      assert(createdPassUser.passwordHash !== null, "Initial user has passwordHash");

      const linkedGoogleId = "google_linked_" + Date.now();
      const linkedUser = await handleGoogleUserLogin({
        sub: linkedGoogleId,
        email: linkEmail,
        email_verified: true,
        name: "Legacy Password Account",
        picture: "https://lh3.googleusercontent.com/a/linked-avatar",
      });

      assert(linkedUser.id === createdPassUser.id, "Account linked to identical database user ID");
      assert(linkedUser.googleId === linkedGoogleId, "User record now has googleId linked");
      assert(linkedUser.passwordHash !== null, "Original passwordHash is preserved during account linking");
      assert(linkedUser.avatarUrl === "https://lh3.googleusercontent.com/a/linked-avatar", "Avatar URL was attached");

      // -------------------------------------------------------------------------
      // 6. Session Token Generation for Google Users
      // -------------------------------------------------------------------------
      console.log("\n6. Testing Session Generation for OAuth Users...");
      const testSessionToken = await encryptSession({
        userId: newGoogleUser.id,
        email: newGoogleUser.email,
        role: newGoogleUser.role,
        tokenVersion: newGoogleUser.tokenVersion,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const decrypted = await decryptSession(testSessionToken);
      assert(decrypted !== null, "OAuth session token decrypts successfully");
      assert(decrypted?.userId === newGoogleUser.id, "Session contains correct OAuth userId");
      assert(decrypted?.email === newGoogleUser.email, "Session contains correct OAuth email");
      assert(decrypted?.role === "USER", "Session contains correct USER role");
      assert(decrypted?.tokenVersion === 1, "Session contains valid tokenVersion");

      // -------------------------------------------------------------------------
      // 7. Cleanup Test Records
      // -------------------------------------------------------------------------
      console.log("\n7. Cleaning up test database records...");
      await prisma.user.deleteMany({
        where: {
          id: { in: [newGoogleUser.id, createdPassUser.id] },
        },
      });
      console.log("  ✓ Test records cleaned up successfully.");

    } finally {
      // Restore initial environment state
      if (originalClientId) {
        process.env.GOOGLE_CLIENT_ID = originalClientId;
      } else {
        delete process.env.GOOGLE_CLIENT_ID;
      }
      if (originalClientSecret) {
        process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
      } else {
        delete process.env.GOOGLE_CLIENT_SECRET;
      }
    }

    console.log("\n==================================================");
    console.log("==================================================");
  });
});
