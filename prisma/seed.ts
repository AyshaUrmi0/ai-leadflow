import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || "admin@novadental.com";
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

  if (!adminPassword) {
    throw new Error(
      "FATAL: ADMIN_INITIAL_PASSWORD environment variable must be configured to seed the admin user."
    );
  }

  console.log(`Seeding initial admin account: ${adminEmail}...`);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });


  if (existingAdmin) {
    console.log("Admin account already exists. Skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Admin User",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`Admin account created successfully! ID: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
