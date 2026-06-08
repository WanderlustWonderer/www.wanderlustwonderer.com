import "server-only";
import type { HistoryMessage } from "./prompt";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

/**
 * Calls Anthropic's Messages API directly over HTTPS (no SDK dependency —
 * keeps the Replit install surface zero). Throws on any failure so the
 * caller can refund the credit.
 */
export async function generateReply(
  system: string,
  history: HistoryMessage[],
  userMessage: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const messages = [
    ...history.map((m) => ({
      role: m.role === "fan" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || DEFAULT_MODEL,
      max_tokens: 512,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content
    ?.filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("");
  if (!text) throw new Error("LLM returned empty reply");
  return text;
}
