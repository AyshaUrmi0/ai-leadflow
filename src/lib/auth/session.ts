import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  tokenVersion?: number;
  expiresAt: string;
}

export const COOKIE_NAME = "admin_session";
const DEFAULT_SECRET = "fallback-dev-secret-key-must-be-changed-in-production-32-chars";

function getEncodedSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: SESSION_SECRET environment variable must be configured in production."
      );
    }
    return new TextEncoder().encode(DEFAULT_SECRET);
  }

  if (secret.length < 32 && process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: SESSION_SECRET must be at least 32 characters long for cryptographic security in production."
    );
  }

  return new TextEncoder().encode(secret);
}


export async function encryptSession(payload: SessionPayload): Promise<string> {
  const tokenVersion = payload.tokenVersion ?? 1;
  return new SignJWT({ ...payload, tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getEncodedSecret());
}

export async function decryptSession(
  sessionToken?: string
): Promise<SessionPayload | null> {
  if (!sessionToken) return null;

  try {
    const { payload } = await jwtVerify(sessionToken, getEncodedSecret(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  email: string,
  role: Role,
  tokenVersion: number = 1
) {
  const expiresAtDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiresAt = expiresAtDate.toISOString();

  const sessionToken = await encryptSession({
    userId,
    email,
    role,
    tokenVersion,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAtDate,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}
