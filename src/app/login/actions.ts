"use server";

import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { checkAIRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const SECONDS_PER_MINUTE = 60;

export interface LoginActionState {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
}

export interface RegisterActionState {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
}

export async function loginAction(
  _prevState: LoginActionState | undefined,
  formData: FormData
): Promise<LoginActionState> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const callbackUrlParam = formData.get("callbackUrl");

  const validationResult = loginSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  });

  if (!validationResult.success) {
    return {
      success: false,
      error: "Please correct the errors in the form.",
      fieldErrors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validationResult.data;

  // Key on IP + email: blocks guessing from one IP without letting anyone lock a victim out from another IP.
  // shortcut: in-memory store is per server instance (weak on serverless), upgrade to Redis/Upstash for production.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const rateLimitKey = `login:${ip}:${email}`;
  const rateLimit = checkAIRateLimit(rateLimitKey, {
    limit: LOGIN_ATTEMPT_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    const minutes = Math.ceil(rateLimit.resetInSeconds / SECONDS_PER_MINUTE);
    return {
      success: false,
      error: `Too many login attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        success: false,
        error: "Invalid email or password.",
      };
    }

    if (!user.passwordHash) {
      return {
        success: false,
        error: "This account was registered with Google. Please sign in with Google.",
      };
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return {
        success: false,
        error: "Invalid email or password.",
      };
    }

    clearRateLimit(rateLimitKey);
    await createSession(user.id, user.email, user.role, user.tokenVersion);

    // Role-aware redirect with open-redirect prevention
    let targetRedirect = user.role === "ADMIN" ? "/admin/dashboard" : "/portal";
    if (
      user.role === "ADMIN" &&
      typeof callbackUrlParam === "string" &&
      (callbackUrlParam === "/admin" || callbackUrlParam.startsWith("/admin/"))
    ) {
      targetRedirect = callbackUrlParam;
    } else if (
      user.role === "USER" &&
      typeof callbackUrlParam === "string" &&
      (callbackUrlParam === "/portal" || callbackUrlParam.startsWith("/portal/"))
    ) {
      targetRedirect = callbackUrlParam;
    }

    redirect(targetRedirect);
  } catch (error) {
    // Next.js redirect throws a special error digest that must be re-thrown
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    console.error("Unhandled error during login:", error);
    return {
      success: false,
      error: "An unexpected error occurred during login. Please try again.",
    };
  }
}

export async function demoLoginAction(role: "ADMIN" | "USER"): Promise<LoginActionState> {
  const email =
    role === "ADMIN"
      ? process.env.ADMIN_INITIAL_EMAIL || "admin@novadental.com"
      : process.env.USER_INITIAL_EMAIL || "user@novadental.com";

  const password =
    role === "ADMIN"
      ? process.env.ADMIN_INITIAL_PASSWORD
      : process.env.USER_INITIAL_PASSWORD;

  if (!password) {
    const varName = role === "ADMIN" ? "ADMIN_INITIAL_PASSWORD" : "USER_INITIAL_PASSWORD";
    return {
      success: false,
      error: `Demo credentials are not configured on the server. Please set ${varName}.`,
    };
  }

  const formData = new FormData();
  formData.append("email", email);
  formData.append("password", password);

  return loginAction(undefined, formData);
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

export async function registerAction(
  _prevState: RegisterActionState | undefined,
  formData: FormData
): Promise<RegisterActionState> {
  const rawName = formData.get("name");
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  const validationResult = registerSchema.safeParse({
    name: rawName,
    email: rawEmail,
    password: rawPassword,
  });

  if (!validationResult.success) {
    return {
      success: false,
      error: "Please correct the errors in the form.",
      fieldErrors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = validationResult.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email address already exists.",
      };
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "USER",
      },
    });

    await createSession(user.id, user.email, user.role, user.tokenVersion);

    redirect("/portal");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    // Two concurrent sign-ups with the same email both pass findUnique; the unique constraint rejects the second
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        error: "An account with this email address already exists.",
      };
    }

    console.error("Unhandled error during registration:", error);
    return {
      success: false,
      error: "An unexpected error occurred during registration. Please try again.",
    };
  }
}
