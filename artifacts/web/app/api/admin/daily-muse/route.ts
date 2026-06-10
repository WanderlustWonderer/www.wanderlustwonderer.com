import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isAdmin } from "@/lib/admin/guard";
import { generateReply } from "@/lib/companion/llm";

export const runtime = "nodejs";

const SYSTEM = `You are Tasmyn, known to your members as "the Muse" of Wanderlust Wonderer — a premium, intimate, slightly mysterious creator membership. You speak to paying members you have a warm personal relationship with.

Your task: write THREE distinct "daily message" drafts she could send to her members today to keep the relationship warm and bring them back.

Voice rules:
- First person, warm, personal, a little flirtatious, never crude.
- British English. No hashtags. No markdown. At most ONE tasteful emoji per message.
- Each message under 280 characters. Sound like a real woman messaging someone she likes, not marketing.

Make the three DIFFERENT from each other:
1. A warm, affectionate check-in (pure connection, no ask).
2. Something playful and teasing.
3. One that gently nudges toward unlocking content or booking time with her.

Output ONLY the three messages, separated by a line containing exactly three dashes: ---
Do not number them. Do not add any preamble or labels.`;

function clean(s: string): string {
  return s
    .replace(/^\s*(option\s*\d+\s*[:.\-]?)/i, "")
    .replace(/^\s*\d+\s*[).:\-]\s*/, "")
    .replace(/^["'“]+|["'”]+$/g, "")
    .trim();
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  let theme = "";
  try { const b = await req.json(); theme = String(b?.theme ?? "").slice(0, 200); } catch { /* no body */ }

  const userMsg = theme
    ? `Today's theme or context to weave in: "${theme}". Write today's three message options.`
    : `Write today's three message options.`;

  try {
    const text = await generateReply(SYSTEM, [], userMsg);
    const options = text
      .split(/\n?\s*-{3,}\s*\n?/)
      .map(clean)
      .filter((s) => s.length > 0)
      .slice(0, 3);
    if (options.length === 0) return NextResponse.json({ error: "generation_failed" }, { status: 500 });
    return NextResponse.json({ options });
  } catch {
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
