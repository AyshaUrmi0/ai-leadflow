import { expect, test } from "@playwright/test";
import { USER, signIn } from "./helpers";

test("patient (USER) visiting /admin is redirected to the portal", async ({ page }) => {
  await signIn(page, USER);
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole("heading", { level: 1, name: /Welcome back/ })).toHaveCount(0);
});
