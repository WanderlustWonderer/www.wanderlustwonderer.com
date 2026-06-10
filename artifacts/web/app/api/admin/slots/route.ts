import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin, isAal2 } from "@/lib/admin/guard";
import { CREATOR } from "@/config/creator";

export const runtime = "nodejs";

interface SlotInput { productId?: string; startsAtIso?: string; durationMin?: number }

/**
 * POST — add bookable slot(s). Accepts either a single slot
 * { productId, startsAtIso, durationMin } or a batch { slots: SlotInput[] }.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  if (!(await isAal2(supabase))) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  let body: SlotInput & { slots?: SlotInput[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

  const inputs: SlotInput[] = Array.isArray(body.slots) ? body.slots.slice(0, 200) : [body];
  if (inputs.length === 0) return NextResponse.json({ error: "no_slots" }, { status: 400 });

  const admin = createAdminClient();
  const { data: creator } = await admin.from("creators").select("id").eq("slug", CREATOR.slug).single();
  if (!creator) return NextResponse.json({ error: "no_creator" }, { status: 400 });

  // Validate referenced booking products once.
  const productIds = [...new Set(inputs.map((s) => s.productId).filter(Boolean) as string[])];
  const { data: products } = await admin.from("products").select("id").eq("product_type", "booking").in("id", productIds);
  const validProducts = new Set((products ?? []).map((p) => p.id));

  const now = Date.now();
  const rows: Record<string, unknown>[] = [];
  for (const s of inputs) {
    if (!s.productId || !validProducts.has(s.productId) || !s.startsAtIso) continue;
    const when = new Date(s.startsAtIso);
    if (isNaN(when.getTime()) || when.getTime() <= now) continue;
    rows.push({
      creator_id: creator.id,
      product_id: s.productId,
      starts_at: when.toISOString(),
      duration_min: s.durationMin && s.durationMin > 0 ? s.durationMin : 30,
    });
  }
  if (rows.length === 0) return NextResponse.json({ error: "invalid_time" }, { status: 400 });

  const { error } = await admin.from("availability_slots").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, added: rows.length });
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
