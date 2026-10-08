import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { recordSecurityAudit } from "@/lib/services/audit";
import { Prisma, Role } from "@prisma/client";

/**
 * Retrieves all active admin users for assignment selection.
 * Excludes sensitive fields like `passwordHash`.
 */
export async function getAdminUsers() {
  return await prisma.user.findMany({
    where: { role: Role.ADMIN },
    orderBy: [
      { name: "asc" },
      { email: "asc" },
    ],
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

/**
 * Retrieves all users (admins and staff) with summary metrics for the team management UI.
 * Explicitly excludes passwordHash from being loaded or returned.
 */
export async function getTeamMembers() {
  return await prisma.user.findMany({
    orderBy: [
      { role: "asc" }, // ADMIN before USER alphabetically
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          assignedTasks: true,
          authoredNotes: true,
          leads: true,
        },
      },
    },
  });
}

export interface CreateTeamMemberParams {
  name: string;
  email: string;
  password: string;
  role?: Role;
  actorId?: string;
  actorEmail?: string;
}

/**
 * Provisions a new team member with either ADMIN or USER role.
 * Guarantees:
 * - Hashes passwords securely with bcrypt (12 rounds).
 * - Never returns or leaks plaintext passwords or password hashes.
 * - Handles race conditions on duplicate emails with atomic database constraints.
 * - Records a structured security audit log for tracking privileged creation.
 */
export async function createTeamMember(data: CreateTeamMemberParams) {
  const normalizedEmail = data.email.trim().toLowerCase();
  const assignedRole = data.role === Role.ADMIN ? Role.ADMIN : Role.USER;

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing) {
    throw new Error("An account with this email address already exists.");
  }

  const passwordHash = await hashPassword(data.password);

  try {
    const newUser = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: assignedRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Record audit event without any password material
    recordSecurityAudit({
      action: newUser.role === Role.ADMIN ? "ADMIN_CREATED" : "USER_CREATED",
      actorId: data.actorId || "system",
      actorEmail: data.actorEmail,
      targetUserId: newUser.id,
      targetUserEmail: newUser.email,
      details: {
        assignedRole: newUser.role,
      },
    });

    return newUser;
  } catch (error) {
    // Handle database-level unique constraint collision (P2002) in race conditions
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("An account with this email address already exists.");
    }
    throw error;
  }
}

export interface UpdateUserRoleParams {
  targetUserId: string;
  newRole: Role;
  currentAdminId: string;
}

/**
 * Updates an existing user's role with transactional safeguards:
 * - Prevents self-demotion (administrator cannot revoke their own admin rights).
 * - Prevents demoting the last remaining administrator (guaranteed via transaction lock).
 * - Verifies caller has active ADMIN privileges.
 * - Emits a secure audit record of the privilege modification.
 */
export async function updateUserRole({
  targetUserId,
  newRole,
  currentAdminId,
}: UpdateUserRoleParams) {
  if (targetUserId === currentAdminId && newRole !== Role.ADMIN) {
    throw new Error("You cannot remove administrator privileges from your own account.");
  }

  const executeTransaction = async () => {
    return await prisma.$transaction(
      async (tx) => {
        // Verify caller is an active administrator
        const caller = await tx.user.findUnique({
          where: { id: currentAdminId },
          select: { id: true, email: true, role: true },
        });

        if (!caller || caller.role !== Role.ADMIN) {
          throw new Error("Caller does not possess active administrator privileges.");
        }

        const targetUser = await tx.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, email: true, role: true },
        });

        if (!targetUser) {
          throw new Error("User account not found.");
        }

        // Invariant: System must never end up with zero active administrators
        if (targetUser.role === Role.ADMIN && newRole !== Role.ADMIN) {
          const adminCount = await tx.user.count({
            where: { role: Role.ADMIN },
          });

          if (adminCount <= 1) {
            throw new Error("Cannot demote the last remaining administrator in the clinic.");
          }
        }

        const updatedUser = await tx.user.update({
          where: { id: targetUserId },
          data: {
            role: newRole,
            tokenVersion: { increment: 1 },
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            tokenVersion: true,
            updatedAt: true,
          },
        });

        // Record audit event
        recordSecurityAudit({
          action: "ROLE_CHANGED",
          actorId: caller.id,
          actorEmail: caller.email,
          targetUserId: updatedUser.id,
          targetUserEmail: updatedUser.email,
          details: {
            previousRole: targetUser.role,
            newRole: updatedUser.role,
          },
        });

        return updatedUser;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  };

  try {
    return await executeTransaction();
  } catch (error) {
    // Handle transient PostgreSQL serialization failure (SQLSTATE 40001 / Prisma P2034)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      try {
        return await executeTransaction();
      } catch (retryError) {
        if (
          retryError instanceof Prisma.PrismaClientKnownRequestError &&
          retryError.code === "P2034"
        ) {
          throw new Error("Concurrent administrative update detected. Please try again.");
        }
        throw retryError;
      }
    }
    throw error;
  }
}

/**
 * Revokes all active sessions for a user by atomically incrementing their tokenVersion.
 */
export async function revokeUserSessions(userId: string) {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      tokenVersion: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
      tokenVersion: true,
    },
  });
}
