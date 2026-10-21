import { expect, test } from "@playwright/test";
import { ADMIN, USER, signIn, submitLogin } from "./helpers";

test("admin signs in with email and password and lands on the dashboard", async ({ page }) => {
  await signIn(page, ADMIN);
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
});

test("user signs in with email and password and lands in the portal", async ({ page }) => {
  await signIn(page, USER);
  await expect(page).toHaveURL(/\/portal$/);
});

test("wrong password shows an error and stays on login", async ({ page }) => {
  await submitLogin(page, { email: ADMIN.email, password: "not-the-password" });
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("logged-out visit to admin redirects to login with callbackUrl", async ({ page }) => {
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
});
