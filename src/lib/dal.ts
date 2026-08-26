import "server-only";
import { cache } from "react";
import { getSessionCookie, decryptSession, type SessionPayload } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export interface VerifySessionResult {
  isAuth: boolean;
  userId: string | null;
  email: string | null;
  role: string | null;
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
    };
  }

  return {
    isAuth: true,
    userId: session.userId,
    email: session.email,
    role: session.role,
  };
});

export const getAuthenticatedAdmin = cache(async () => {
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
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
        createdAt: true,
      },
    });

    if (!user || user.role !== "ADMIN") {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Failed to fetch authenticated admin user:", error);
    return null;
  }
});
