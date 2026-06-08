import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getStripe } from "@/lib/companion/stripe";
import { getAppUrl } from "@/lib/app-url";
import { ensureCompanionProfile } from "@/lib/companion/profile";

export const runtime = "nodejs";

/**
 * POST { kind: "photo" | "video" } — fan unlocks the NEXT item in the shared queue.
 *
 * Each fan progresses through the library independently and never receives the
 * same item twice. If they have an unpaid item of this kind already waiting, we
 * re-offer that same one (so they can't stack up unpaid messages or skip ahead).
 * Otherwise we materialise the next undelivered library item into their thread
 * as a locked message, then send them to Stripe. The existing content-unlock
 * webhook flips locked=false on payment.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { kind?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const kind = body.kind === "video" ? "video" : "photo";

  const admin = createAdminClient();

  // The fan's conversation (create one if they've never messaged).
  let { data: conv } = await admin
    .from("conversations").select("id").eq("profile_id", user.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!conv) {
    const profile = await ensureCompanionProfile(
      admin, user.id,
      (user.user_metadata?.display_name as string) ?? user.email?.split("@")[0],
      (user.user_metadata?.age_confirmed_at as string) ?? null
    );
    const { data: created, error } = await admin.from("conversations").insert({ profile_id: user.id, creator_id: profile.creator_id }).select("id").single();
    if (error || !created) return NextResponse.json({ error: "no_conversation" }, { status: 500 });
    conv = created;
  }

  // 1) Re-offer an already-delivered-but-unpaid item of this kind, if any.
  const { data: pending } = await admin
    .from("chat_messages")
    .select("id, media_kind, price_pence")
    .eq("profile_id", user.id).eq("kind", "media").eq("media_kind", kind)
    .eq("locked", true).not("queue_item_id", "is", null)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();

  let messageId: string;
  let pricePence: number;

  if (pending) {
    messageId = pending.id;
    pricePence = pending.price_pence ?? 0;
  } else {
    // 2) Find the next library item this fan has NOT been given yet.
    const { data: delivered } = await admin
      .from("chat_messages").select("queue_item_id")
      .eq("profile_id", user.id).not("queue_item_id", "is", null);
    const deliveredIds = (delivered ?? []).map((d: any) => d.queue_item_id).filter(Boolean);

    let q = admin.from("media_queue").select("id, media_path, caption, price_pence")
      .eq("active", true).eq("kind", kind);
    if (deliveredIds.length) q = q.not("id", "in", `(${deliveredIds.join(",")})`);
    const { data: next } = await q.order("position", { ascending: true }).limit(1).maybeSingle();
    if (!next) return NextResponse.json({ error: "queue_empty" }, { status: 409 });

    const { data: inserted, error: insErr } = await admin.from("chat_messages").insert({
      conversation_id: conv.id, profile_id: user.id, role: "creator", status: "sent",
      kind: "media", media_kind: kind, media_path: next.media_path,
      content: next.caption || (kind === "video" ? "A little video for you 🎬" : "A photo, just for you 📸"),
      caption: next.caption ?? "", price_pence: next.price_pence, locked: true, queue_item_id: next.id,
    }).select("id").single();
    if (insErr || !inserted) return NextResponse.json({ error: "deliver_failed" }, { status: 500 });
    messageId = inserted.id;
    pricePence = next.price_pence;
  }

  const stripe = getStripe();
  const appUrl = getAppUrl(req);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    line_items: [{
      price_data: {
        currency: "gbp",
        unit_amount: pricePence,
        product_data: { name: kind === "video" ? "Private video" : "Private photo" },
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/chat?unlocked=1`,
    cancel_url: `${appUrl}/chat`,
    metadata: { content_unlock: "1", message_id: messageId, user_id: user.id },
  });
  return NextResponse.json({ url: session.url });
}
