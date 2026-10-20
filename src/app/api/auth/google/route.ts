import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import {
  isGoogleAuthConfigured,
  getBaseUrl,
  getGoogleAuthUrl,
} from "@/lib/auth/google";

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  if (!isGoogleAuthConfigured()) {
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", "GoogleAuthNotConfigured");
    return NextResponse.redirect(loginUrl);
  }

  // Extract and sanitize callbackUrl to prevent open redirects
  const rawCallbackUrl = request.nextUrl.searchParams.get("callbackUrl");
  let safeCallbackUrl = "/portal";
  if (
    rawCallbackUrl &&
    rawCallbackUrl.startsWith("/") &&
    !rawCallbackUrl.startsWith("//") &&
    !rawCallbackUrl.startsWith("/\\")
  ) {
    safeCallbackUrl = rawCallbackUrl;
  }

  const state = crypto.randomBytes(32).toString("hex");
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const googleUrl = getGoogleAuthUrl(state, redirectUri);

  const response = NextResponse.redirect(googleUrl);
  const isProduction = process.env.NODE_ENV === "production";

  // State token for CSRF protection
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  });

  // Target destination after successful authentication
  response.cookies.set("google_oauth_callback", safeCallbackUrl, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  });

  return response;
}
