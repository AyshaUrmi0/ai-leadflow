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

    if (!user || user.role !== "ADMIN") {
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

    // Sanitize callback URL for open redirect prevention
    let targetRedirect = "/admin/leads";
    if (
      typeof callbackUrlParam === "string" &&
      (callbackUrlParam === "/admin" || callbackUrlParam.startsWith("/admin/"))
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

export async function logoutAction() {
  await deleteSession();
  redirect("/admin/login");
}
