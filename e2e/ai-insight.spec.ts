import { expect, test } from "@playwright/test";
import { ADMIN, signIn } from "./helpers";

test("admin generates an AI insight for a lead (Gemini stubbed)", async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto("/admin/leads?search=test@example.com");
  await page.getByRole("button", { name: "View", exact: true }).first().click();

  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: "Generate AI Insight" }).click();

  const insight = drawer.getByRole("region", { name: "AI Advisory Insights" });
  await expect(insight.getByRole("status", { name: "Lead urgency level: HIGH" })).toBeVisible();
  await expect(insight.getByText("Patient asked about cosmetic veneers")).toBeVisible();
});
