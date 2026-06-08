import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin } from "@/lib/admin/guard";
import { CREATOR } from "@/config/creator";

export const runtime = "nodejs";

/** POST { productId, startsAtIso, durationMin } — add a bookable slot (admin only). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  let body: { productId?: string; startsAtIso?: string; durationMin?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.productId || !body.startsAtIso) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const when = new Date(body.startsAtIso);
  if (isNaN(when.getTime()) || when <= new Date()) return NextResponse.json({ error: "invalid_time" }, { status: 400 });

  const admin = createAdminClient();
  const { data: creator } = await admin.from("creators").select("id").eq("slug", CREATOR.slug).single();
  const { data: product } = await admin.from("products").select("id").eq("id", body.productId).eq("product_type", "booking").maybeSingle();
  if (!creator || !product) return NextResponse.json({ error: "bad_product" }, { status: 400 });

  const { error } = await admin.from("availability_slots").insert({
    creator_id: creator.id,
    product_id: body.productId,
    starts_at: when.toISOString(),
    duration_min: body.durationMin ?? 30,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE { slotId } — remove an OPEN slot (admin only). */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  let body: { slotId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.slotId) return NextResponse.json({ error: "missing_slot" }, { status: 400 });
  const admin = createAdminClient();
  await admin.from("availability_slots").delete().eq("id", body.slotId).eq("status", "open");
  return NextResponse.json({ ok: true });
}
