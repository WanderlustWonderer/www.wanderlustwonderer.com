import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin, isAal2 } from "@/lib/admin/guard";

export const runtime = "nodejs";

type Body = {
  segment?: "everyone" | "members" | "guests" | "the_gallery" | "private_world" | "all_access";
  content?: string;
  mediaQueueId?: string | null;
  pricePence?: number | null;
  caption?: string | null;
};

const ACTIVE = ["active", "trialing"];

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  if (!(await isAal2(supabase))) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_body" }, { status: 400 }); }
  const segment = body.segment ?? "everyone";
  const content = (body.content ?? "").trim();
  const isPPV = !!body.mediaQueueId && !!body.pricePence && body.pricePence > 0;
  if (!content && !isPPV) return NextResponse.json({ error: "empty" }, { status: 400 });

  const admin = createAdminClient();

  // Resolve recipients
  let q = admin.from("profiles").select("id, membership_tier, subscription_status");
  const { data: rows } = await q.limit(100000);
  const recipients = (rows ?? []).filter((p: any) => {
    if (p.id === user!.id) return false; // never broadcast to yourself
    const active = !!p.subscription_status && ACTIVE.includes(p.subscription_status);
    if (segment === "everyone") return true;
    if (segment === "members") return active;
    if (segment === "guests") return !active;
    return active && p.membership_tier === segment; // specific tier
  });
  if (recipients.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  // Creator id (for conversations) — from an existing conversation, fall back to companion creator.
  let creatorId: string | null = null;
  const { data: anyConv } = await admin.from("conversations").select("creator_id").limit(1).maybeSingle();
  creatorId = anyConv?.creator_id ?? null;
  if (!creatorId) {
    const { data: cp } = await admin.from("companion_profiles").select("creator_id").limit(1).maybeSingle();
    creatorId = cp?.creator_id ?? null;
  }
  if (!creatorId) return NextResponse.json({ error: "no_creator" }, { status: 500 });

  // PPV media (optional)
  let media: any = null;
  if (isPPV && body.mediaQueueId) {
    const { data: m } = await admin.from("media_queue").select("media_path, kind, caption").eq("id", body.mediaQueueId).maybeSingle();
    media = m;
  }

  // Existing conversations
  const ids = recipients.map((r: any) => r.id);
  const { data: convs } = await admin.from("conversations").select("id, profile_id").in("profile_id", ids);
  const convByProfile = new Map((convs ?? []).map((c: any) => [c.profile_id, c.id]));

  // Create missing conversations
  const missing = recipients.filter((r: any) => !convByProfile.has(r.id));
  if (missing.length) {
    const { data: created } = await admin.from("conversations")
      .insert(missing.map((r: any) => ({ profile_id: r.id, creator_id: creatorId })))
      .select("id, profile_id");
    for (const c of created ?? []) convByProfile.set(c.profile_id, c.id);
  }

  // Build + insert messages
  const msgs = recipients
    .map((r: any) => {
      const conversation_id = convByProfile.get(r.id);
      if (!conversation_id) return null;
      if (isPPV && media) {
        return {
          conversation_id, profile_id: r.id, role: "creator", status: "sent",
          kind: media.kind ?? "media", media_kind: media.kind ?? "photo", media_path: media.media_path,
          caption: body.caption ?? media.caption ?? null, content: content || body.caption || "🔒 Unlock to see",
          price_pence: body.pricePence, locked: true, queue_item_id: body.mediaQueueId,
        };
      }
      return { conversation_id, profile_id: r.id, role: "creator", status: "sent", kind: "text", content };
    })
    .filter(Boolean);

  // Insert in chunks
  let sent = 0;
  for (let i = 0; i < msgs.length; i += 500) {
    const chunk = msgs.slice(i, i + 500);
    const { error } = await admin.from("chat_messages").insert(chunk as any);
    if (!error) sent += chunk.length;
  }
  return NextResponse.json({ ok: true, sent });
}
