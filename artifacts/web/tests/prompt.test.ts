import { describe, expect, it } from "vitest";
import { buildSystemPrompt, selectHistory, type HistoryMessage } from "@/lib/companion/prompt";

describe("buildSystemPrompt", () => {
  const prompt = buildSystemPrompt("");

  it("always discloses AI identity", () => {
    expect(prompt).toMatch(/you are an ai/i);
    expect(prompt).toMatch(/never pretend to be the real human/i);
  });

  it("enforces the content ceiling", () => {
    expect(prompt).toMatch(/never explicit/i);
  });

  it("forbids real-world meetings", () => {
    expect(prompt).toMatch(/never arrange or imply real-world meetings/i);
  });

  it("includes 18+ handling", () => {
    expect(prompt).toMatch(/18\+/);
  });

  it("includes memory summary when present", () => {
    const withMemory = buildSystemPrompt("Fan's name is Alex, loves Bali.");
    expect(withMemory).toContain("Fan's name is Alex");
    expect(prompt).not.toContain("What you remember");
  });
});

describe("selectHistory", () => {
  const make = (n: number): HistoryMessage[] =>
    Array.from({ length: n }, (_, i) => ({
      role: i % 2 === 0 ? "fan" : "ai",
      content: `msg ${i}`,
    }));

  it("returns everything under the depth limit", () => {
    expect(selectHistory(make(5), "free")).toHaveLength(5);
  });

  it("trims to tier depth keeping the most recent", () => {
    const result = selectHistory(make(200), "fan");
    expect(result).toHaveLength(24);
    expect(result[23].content).toBe("msg 199");
  });

  it("deeper tiers remember more", () => {
    expect(selectHistory(make(200), "inner").length).toBeGreaterThan(
      selectHistory(make(200), "fan").length
    );
  });
});
