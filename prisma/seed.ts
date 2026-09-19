import {
  LeadActivityType,
  LeadStatus,
  PrismaClient,
  Role,
  TaskStatus,
} from "@prisma/client";
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

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin User",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`Admin ready: ${admin.email}`);

  const lead = await prisma.lead.upsert({
    where: { id: "seed-lead-nova-dental" },
    update: {},
    create: {
      id: "seed-lead-nova-dental",
      name: "Test User",
      email: "test@example.com",
      phone: "+8801700000000",
      serviceInterest: "Dental Consultation",
      message:
        "I would like to schedule a consultation and learn more about the available treatment options.",
      consentGiven: true,
      status: LeadStatus.NEW,
      source: "seed",
    },
  });

  console.log(`Lead ready: ${lead.name}`);

  await prisma.leadNote.upsert({
    where: { id: "seed-note-nova-dental" },
    update: {},
    create: {
      id: "seed-note-nova-dental",
      leadId: lead.id,
      authorId: admin.id,
      content: "Seed note for local development and CI verification.",
    },
  });

  await prisma.leadTask.upsert({
    where: { id: "seed-task-nova-dental" },
    update: {},
    create: {
      id: "seed-task-nova-dental",
      leadId: lead.id,
      creatorId: admin.id,
      title: "Follow up with lead",
      description: "Contact the lead about their consultation request.",
      status: TaskStatus.PENDING,
    },
  });

  await prisma.leadActivityLog.upsert({
    where: { id: "seed-activity-nova-dental" },
    update: {},
    create: {
      id: "seed-activity-nova-dental",
      leadId: lead.id,
      actorId: admin.id,
      type: LeadActivityType.STATUS_CHANGE,
      details: {
        from: null,
        to: LeadStatus.NEW,
        source: "seed",
      },
    },
  });

  console.log("Seed data ready.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });