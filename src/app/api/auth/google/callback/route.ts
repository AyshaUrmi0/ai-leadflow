import { NextResponse, type NextRequest } from "next/server";
import {
  getBaseUrl,
  exchangeGoogleCode,
  getGoogleUserInfo,
  handleGoogleUserLogin,
} from "@/lib/auth/google";
import { encryptSession, COOKIE_NAME } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // Handle OAuth provider error or consent cancellation
  if (errorParam) {
    const errorUrl = new URL("/login", baseUrl);
    errorUrl.searchParams.set("error", "GoogleAuthFailed");
    errorUrl.searchParams.set("details", errorParam);
    const res = NextResponse.redirect(errorUrl);
    res.cookies.delete("google_oauth_state");
    res.cookies.delete("google_oauth_callback");
    return res;
  }

  // Retrieve stored CSRF state and intended callback URL
  const storedState = request.cookies.get("google_oauth_state")?.value;
  const storedCallbackUrl = request.cookies.get("google_oauth_callback")?.value || "/portal";

  // Validate CSRF state token
  if (!code || !state || !storedState || state !== storedState) {
    const errorUrl = new URL("/login", baseUrl);
    errorUrl.searchParams.set("error", "InvalidOAuthState");
    const res = NextResponse.redirect(errorUrl);
    res.cookies.delete("google_oauth_state");
    res.cookies.delete("google_oauth_callback");
    return res;
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);

    if (!tokens || !tokens.access_token) {
      const errorUrl = new URL("/login", baseUrl);
      errorUrl.searchParams.set("error", "GoogleTokenExchangeFailed");
      const res = NextResponse.redirect(errorUrl);
      res.cookies.delete("google_oauth_state");
      res.cookies.delete("google_oauth_callback");
      return res;
    }

    const profile = await getGoogleUserInfo(tokens.access_token);

    if (!profile || !profile.email) {
      const errorUrl = new URL("/login", baseUrl);
      errorUrl.searchParams.set("error", "GoogleProfileFetchFailed");
      const res = NextResponse.redirect(errorUrl);
      res.cookies.delete("google_oauth_state");
      res.cookies.delete("google_oauth_callback");
      return res;
    }

    if (!profile.email_verified) {
      const errorUrl = new URL("/login", baseUrl);
      errorUrl.searchParams.set("error", "UnverifiedGoogleEmail");
      const res = NextResponse.redirect(errorUrl);
      res.cookies.delete("google_oauth_state");
      res.cookies.delete("google_oauth_callback");
      return res;
    }

    // Link or create user in database
    const user = await handleGoogleUserLogin(profile);

    // Determine target redirect with safety checks
    let target = storedCallbackUrl;
    if (user.role !== "ADMIN" && target.startsWith("/admin")) {
      target = "/portal";
    } else if (target === "/login" || target === "/") {
      target = user.role === "ADMIN" ? "/admin/dashboard" : "/portal";
    }

    const redirectUrl = new URL(target, baseUrl);
    const response = NextResponse.redirect(redirectUrl);

    // Explicitly set cookie on redirect response
    const expiresAtDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionToken = await encryptSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 1,
      expiresAt: expiresAtDate.toISOString(),
    });

    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAtDate,
    });

    // Clear temporary OAuth cookies
    response.cookies.delete("google_oauth_state");
    response.cookies.delete("google_oauth_callback");

    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    const errorUrl = new URL("/login", baseUrl);
    errorUrl.searchParams.set("error", "GoogleAuthError");
    const res = NextResponse.redirect(errorUrl);
    res.cookies.delete("google_oauth_state");
    res.cookies.delete("google_oauth_callback");
    return res;
  }
}
