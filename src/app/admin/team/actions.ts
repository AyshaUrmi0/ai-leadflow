"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedAdmin } from "@/lib/dal";
import { createTeamMemberSchema, updateUserRoleSchema } from "@/lib/validations/team";
import { createTeamMember, updateUserRole } from "@/lib/services/user";
import { Role } from "@prisma/client";

export interface CreateTeamMemberState {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    password?: string[];
    role?: string[];
  };
}

const KNOWN_SAFE_ERRORS = new Set([
  "An account with this email address already exists.",
  "You cannot remove administrator privileges from your own account.",
  "Cannot demote the last remaining administrator in the clinic.",
  "User account not found.",
  "Caller does not possess active administrator privileges.",
  "Concurrent administrative update detected. Please try again.",
]);

/**
 * Server action to provision a new team member (USER or ADMIN).
 * Enforces strict administrator authorization boundary, validates against Role enum,
 * and sanitizes error responses to prevent internal database disclosure.
 */
export async function createTeamMemberAction(
  _prevState: CreateTeamMemberState | undefined,
  formData: FormData
): Promise<CreateTeamMemberState> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return {
      success: false,
      error: "Unauthorized: Administrator privileges are required to perform this action.",
    };
  }

  const rawName = formData.get("name");
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const rawRole = formData.get("role") || Role.ADMIN;

  const validation = createTeamMemberSchema.safeParse({
    name: rawName,
    email: rawEmail,
    password: rawPassword,
    role: rawRole,
  });

  if (!validation.success) {
    return {
      success: false,
      error: "Please correct the errors in the form.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    await createTeamMember({
      name: validation.data.name,
      email: validation.data.email,
      password: validation.data.password,
      role: validation.data.role,
      actorId: admin.id,
      actorEmail: admin.email,
    });

    revalidatePath("/admin/team");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("[Create Team Member Action Error]:", error);
    const message =
      error instanceof Error && KNOWN_SAFE_ERRORS.has(error.message)
        ? error.message
        : "An unexpected error occurred while creating the account. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server action to update a team member's role (promoting or demoting).
 * Enforces strict administrator authorization boundary, prevents self-demotion
 * and last-admin lockout, and sanitizes output errors.
 */
export async function updateUserRoleAction(userId: string, newRole: Role) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return {
      success: false,
      error: "Unauthorized: Administrator privileges are required to perform this action.",
    };
  }

  const validation = updateUserRoleSchema.safeParse({
    userId,
    role: newRole,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Invalid role data.",
    };
  }

  try {
    await updateUserRole({
      targetUserId: validation.data.userId,
      newRole: validation.data.role,
      currentAdminId: admin.id,
    });

    revalidatePath("/admin/team");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("[Update User Role Action Error]:", error);
    const message =
      error instanceof Error && KNOWN_SAFE_ERRORS.has(error.message)
        ? error.message
        : "An unexpected error occurred while updating member permissions. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}
