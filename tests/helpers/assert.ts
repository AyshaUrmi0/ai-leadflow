import { expect } from "vitest";

// expect.soft keeps running after a failure, so every check reports in one run.
export function assert(condition: boolean, testName: string, detail?: string): void {
  expect.soft(condition, detail ? `${testName}: ${detail}` : testName).toBe(true);
}
