import "server-only";
import { cache } from "react";
import { getSessionCookie, decryptSession, type SessionPayload } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export interface VerifySessionResult {
  isAuth: boolean;
  userId: string | null;
  email: string | null;
  role: string | null;
  tokenVersion: number | null;
}

export const verifySession = cache(async (): Promise<VerifySessionResult> => {
  const token = await getSessionCookie();
  const session: SessionPayload | null = await decryptSession(token);

  if (!session || !session.userId || session.role !== "ADMIN") {
    return {
      isAuth: false,
      userId: null,
      email: null,
      role: null,
      tokenVersion: null,
    };
  }

  return {
    isAuth: true,
    userId: session.userId,
    email: session.email,
    role: session.role,
    tokenVersion: session.tokenVersion ?? 1,
  };
});

export const getAuthenticatedAdmin = cache(async () => {
  const token = await getSessionCookie();
  const session: SessionPayload | null = await decryptSession(token);

  if (!session || !session.userId) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tokenVersion: true,
        createdAt: true,
      },
    });

    if (!user || user.role !== "ADMIN") {
      return null;
    }

    // Token Version Revocation Check:
    // If the user's tokenVersion was incremented (e.g. role change, password reset, or session revocation),
    // or if the session tokenVersion doesn't match the database, reject the session.
    const sessionTokenVersion = session.tokenVersion ?? 1;
    if (user.tokenVersion !== sessionTokenVersion) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Failed to fetch authenticated admin user:", error);
    return null;
  }
});

export const getAuthenticatedUser = cache(async () => {
  const token = await getSessionCookie();
  const session: SessionPayload | null = await decryptSession(token);

  if (!session || !session.userId) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tokenVersion: true,
        createdAt: true,
      },
    });

    if (!user) {
      return null;
    }

    // Token Version Revocation Check:
    const sessionTokenVersion = session.tokenVersion ?? 1;
    if (user.tokenVersion !== sessionTokenVersion) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Failed to fetch authenticated user:", error);
    return null;
  }
});
