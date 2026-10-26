import { describe, expect, it } from "vitest";
import { calculateLeadScore, getLeadTemperature } from "../src/lib/services/scoring";

const NOW = new Date("2026-10-26T12:00:00Z");
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const agoMs = (ms: number) => new Date(NOW.getTime() - ms);

// A NEW lead older than 14 days with no extras scores exactly the NEW status points.
const baseLead = { status: "NEW" as const, createdAt: agoMs(30 * DAY_MS) };
const score = (overrides: Partial<Parameters<typeof calculateLeadScore>[0]>) =>
  calculateLeadScore({ ...baseLead, ...overrides }, NOW);

describe("Deterministic lead scoring", () => {
  it("gives status points: NEW 10, CONTACTED 20, QUALIFIED 30", () => {
    expect(score({}).score).toBe(10);
    expect(score({ status: "CONTACTED" }).score).toBe(20);
    expect(score({ status: "QUALIFIED" }).score).toBe(30);
  });

  it("counts contact and intent fields only when they have real content", () => {
    expect(score({ phone: "555-0100" }).score).toBe(20);
    expect(score({ phone: "   " }).score).toBe(10);
    expect(score({ serviceInterest: "Cosmetic consultations" }).score).toBe(20);
    expect(score({ message: "x".repeat(20) }).score).toBe(10);
    expect(score({ message: "x".repeat(21) }).score).toBe(20);
  });

  it("adds engagement points for notes, active tasks and completed tasks", () => {
    expect(score({ noteCount: 3 }).score).toBe(20);
    expect(score({ activeTaskCount: 1 }).score).toBe(20);
    expect(score({ completedTaskCount: 2 }).score).toBe(15);
    expect(score({ noteCount: -5 }).score).toBe(10);
  });

  it("adds recency points at the 48 hour, 7 day and 14 day boundaries", () => {
    expect(score({ createdAt: agoMs(48 * HOUR_MS) }).score).toBe(25);
    expect(score({ createdAt: agoMs(48 * HOUR_MS + 1) }).score).toBe(20);
    expect(score({ createdAt: agoMs(7 * DAY_MS) }).score).toBe(20);
    expect(score({ createdAt: agoMs(14 * DAY_MS) }).score).toBe(15);
    expect(score({ createdAt: agoMs(14 * DAY_MS + 1) }).score).toBe(10);
  });

  it("gives no recency points for future or invalid dates", () => {
    expect(score({ createdAt: new Date(NOW.getTime() + HOUR_MS) }).score).toBe(10);
    expect(score({ createdAt: "not-a-date" }).score).toBe(10);
  });

  it("reaches exactly 100 for a fully engaged, fresh, qualified lead", () => {
    const result = score({
      status: "QUALIFIED",
      phone: "555-0100",
      serviceInterest: "Restorative care",
      message: "I have a broken molar and need help this week.",
      noteCount: 1,
      activeTaskCount: 1,
      completedTaskCount: 1,
      createdAt: NOW,
    });
    expect(result.score).toBe(100);
    expect(result.temperature).toBe("HOT");
    expect(result.reasons).toHaveLength(8);
  });

  it("caps CLOSED_LOST leads at 10 however engaged they are", () => {
    const result = score({
      status: "CLOSED_LOST",
      phone: "555-0100",
      noteCount: 4,
      activeTaskCount: 2,
      createdAt: NOW,
    });
    expect(result.score).toBe(10);
    expect(result.temperature).toBe("COLD");
    expect(result.reasons).toContain("Lead is marked as closed lost");
  });

  it("maps scores to temperature bands at 40 and 70", () => {
    expect(getLeadTemperature(39)).toBe("COLD");
    expect(getLeadTemperature(40)).toBe("WARM");
    expect(getLeadTemperature(69)).toBe("WARM");
    expect(getLeadTemperature(70)).toBe("HOT");
  });

  it("returns the same result for the same input and clock", () => {
    const input = { ...baseLead, phone: "555-0100", noteCount: 1 };
    expect(calculateLeadScore(input, NOW)).toEqual(calculateLeadScore(input, NOW));
  });
});
