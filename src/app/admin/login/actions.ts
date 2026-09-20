"use server";

import { loginSchema } from "@/lib/validations/auth";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export interface LoginActionState {
  success?: boolean;
  error?: string;
  fieldErrors?: {
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

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return {
        success: false,
        error: "Invalid email or password.",
      };
    }

    await createSession(user.id, user.email, user.role);

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
  redirect("/admin/login");
}
