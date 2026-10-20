import "server-only";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export interface GoogleUserProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

/**
 * Returns true if both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured.
 */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}

/**
 * Derives the canonical base URL of the application.
 */
export function getBaseUrl(request?: Request): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  if (request) {
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (host) {
      return `${proto}://${host}`;
    }
  }

  return "http://localhost:3000";
}

/**
 * Constructs the Google OAuth 2.0 authorization URL.
 */
export function getGoogleAuthUrl(state: string, redirectUri: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID environment variable is not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges the Google authorization code for access and ID tokens.
 */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; id_token?: string } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured.");
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Google token exchange failed:", res.status, errText);
    return null;
  }

  return await res.json();
}

/**
 * Fetches user profile metadata from Google's OpenID userinfo endpoint.
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserProfile | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Google userinfo fetch failed:", res.status, errText);
    return null;
  }

  return await res.json();
}

/**
 * Atomically links an existing account or creates a new user record for a verified Google profile.
 * - Enforces verified email security.
 * - Assigns default role 'USER'.
 * - Leaves passwordHash null for OAuth-only users.
 */
export async function handleGoogleUserLogin(profile: GoogleUserProfile): Promise<User> {
  if (!profile.email_verified) {
    throw new Error("Google account email is not verified.");
  }

  const normalizedEmail = profile.email.toLowerCase().trim();

  // Find existing account by googleId OR email
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { googleId: profile.sub },
        { email: normalizedEmail },
      ],
    },
  });

  if (existingUser) {
    const needsLink = !existingUser.googleId;
    const needsAvatar = !existingUser.avatarUrl && Boolean(profile.picture);
    const needsName = !existingUser.name && Boolean(profile.name);

    if (needsLink || needsAvatar || needsName) {
      return await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          googleId: existingUser.googleId || profile.sub,
          avatarUrl: existingUser.avatarUrl || profile.picture || null,
          name: existingUser.name || profile.name || null,
        },
      });
    }

    return existingUser;
  }

  // Create brand new user record
  return await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: profile.name || null,
      googleId: profile.sub,
      avatarUrl: profile.picture || null,
      role: "USER",
      tokenVersion: 1,
    },
  });
}
