import { expect, test } from "@playwright/test";
import { ADMIN, signIn } from "./helpers";

test("admin dashboard renders its welcome heading and KPI section", async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto("/admin/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: /Welcome back/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pipeline Snapshot" })).toBeVisible();
});
