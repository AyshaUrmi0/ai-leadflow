import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { ADMIN, USER, signIn } from "./helpers";

const email = `e2e-${Date.now()}@example.com`;

// Local runs reuse the dev database, so remove the lead this test creates.
test.afterAll(async () => {
  const prisma = new PrismaClient();
  await prisma.lead.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

test("patient submits a consultation request and admin sees it", async ({ page, browser }) => {
  await signIn(page, USER);
  await page.goto("/");
  await page.getByLabel("Full Name").fill("E2E Patient");
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel(/I agree to be contacted/).check();
  await page.getByRole("button", { name: "Request consultation" }).click();
  await expect(page.getByRole("heading", { name: "Consultation Request Received" })).toBeVisible();

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await signIn(admin, ADMIN);
  await admin.goto(`/admin/leads?search=${encodeURIComponent(email)}`);
  await expect(admin.getByText(email)).toBeVisible();
  await adminContext.close();
});
