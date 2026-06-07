import { describe, expect, it } from "vitest";
import { buildSystemPrompt, selectHistory, MEMORY_DEPTH, type HistoryMessage } from "@/lib/companion/prompt";

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
    expect(selectHistory(make(5))).toHaveLength(5);
  });

  it("trims to MEMORY_DEPTH keeping the most recent", () => {
    const result = selectHistory(make(200));
    expect(result).toHaveLength(MEMORY_DEPTH);
    expect(result[result.length - 1].content).toBe("msg 199");
  });
});
