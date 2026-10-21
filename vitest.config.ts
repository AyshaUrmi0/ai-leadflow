import path from "node:path";
import { defineConfig } from "vitest/config";

// Suites run a full check pass (DB + bcrypt), so the 5s default is too short.
const SUITE_TIMEOUT_MS = 120_000;

export default defineConfig({
  resolve: {
    alias: [
      // Matches "@/lib/prisma"; rejects "@prisma/client" and "lib/@/x".
      { find: /^@\//, replacement: `${path.resolve(__dirname, "src")}/` },
      // Matches exactly "server-only"; rejects "server-only/x".
      { find: /^server-only$/, replacement: path.resolve(__dirname, "tests/stubs/server-only.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Suites share one Postgres database, so files run one at a time.
    fileParallelism: false,
    testTimeout: SUITE_TIMEOUT_MS,
    hookTimeout: SUITE_TIMEOUT_MS,
  },
});
