import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

// Allowlisted event names — anything else is ignored (keeps the table clean).
const ALLOWED = new Set([
  "page_view", "signup_view", "signup_submit", "subscribe_view",
  "checkout_started", "credits_checkout_started", "collection_checkout_started",
  "chat_message_sent", "content_unlock_started", "age_gate_entered",
]);

export async function POST(req: Request) {
  let body: { event?: string; path?: string; sessionId?: string; props?: Record<string, unknown> };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const event = (body.event ?? "").slice(0, 64);
  if (!ALLOWED.has(event)) return NextResponse.json({ ok: true }); // silently ignore unknown

  // Optional: attach the logged-in user if there is one.
  let profileId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    profileId = user?.id ?? null;
  } catch { /* anon */ }

  const admin = createAdminClient();
  await admin.from("analytics_events").insert({
    event,
    path: (body.path ?? "").slice(0, 256),
    profile_id: profileId,
    session_id: (body.sessionId ?? "").slice(0, 64) || null,
    props: body.props && typeof body.props === "object" ? body.props : null,
  });

  return NextResponse.json({ ok: true });
}
