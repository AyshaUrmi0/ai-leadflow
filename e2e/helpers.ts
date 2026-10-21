import type { Page } from "@playwright/test";

export type Account = { email: string; password: string };

// Same values the seed uses; CI and local .env override them via *_INITIAL_* variables.
export const ADMIN: Account = {
  email: process.env.ADMIN_INITIAL_EMAIL ?? "admin@novadental.com",
  password: process.env.ADMIN_INITIAL_PASSWORD ?? "SecureAdminPassword123!",
};

export const USER: Account = {
  email: process.env.USER_INITIAL_EMAIL ?? "user@novadental.com",
  password: process.env.USER_INITIAL_PASSWORD ?? "DemoUserPassword123!",
};

// Fills and submits the login form without waiting for the outcome.
export async function submitLogin(page: Page, account: Account): Promise<void> {
  await page.goto("/login");
  // Wait for React hydration: before it, a submit can fire as a native form post and lose the sign-in.
  await page.waitForFunction(() => {
    const form = document.querySelector("form");
    return !!form && Object.keys(form).some((key) => key.startsWith("__reactFiber"));
  });
  await page.getByLabel("Email Address").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
}

// Signs in and waits until the login page has redirected away, so the session cookie is set.
export async function signIn(page: Page, account: Account): Promise<void> {
  await submitLogin(page, account);
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}
