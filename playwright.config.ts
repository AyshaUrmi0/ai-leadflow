import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 3100;
const GEMINI_STUB_PORT = 4010;
// "localhost" (not 127.0.0.1): the session cookie is Secure in production mode, and Chromium only stores Secure cookies on localhost over http.
const APP_URL = `http://localhost:${APP_PORT}`;
const GEMINI_STUB_URL = `http://127.0.0.1:${GEMINI_STUB_PORT}`;
const IS_CI = Boolean(process.env.CI);
const EXPECT_TIMEOUT_MS = 15_000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: IS_CI ? 1 : 0,
  forbidOnly: IS_CI,
  // Server-rendered dashboards are slow under a cold `next start`; the 5s default is too tight.
  expect: { timeout: EXPECT_TIMEOUT_MS },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `pnpm exec tsx e2e/gemini-stub.ts ${GEMINI_STUB_PORT}`,
      url: `${GEMINI_STUB_URL}/health`,
      reuseExistingServer: !IS_CI,
    },
    {
      command: `pnpm exec next start -p ${APP_PORT}`,
      url: APP_URL,
      reuseExistingServer: !IS_CI,
      env: {
        GEMINI_API_KEY: "e2e-fake-key",
        GOOGLE_GEMINI_BASE_URL: GEMINI_STUB_URL,
      },
    },
  ],
});
