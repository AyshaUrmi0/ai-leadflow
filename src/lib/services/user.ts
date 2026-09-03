import { prisma } from "@/lib/prisma";

/**
 * Retrieves all active admin users for assignment selection.
 * Excludes sensitive fields like `passwordHash`.
 */
export async function getAdminUsers() {
  return await prisma.user.findMany({
    where: { role: "ADMIN" },
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
