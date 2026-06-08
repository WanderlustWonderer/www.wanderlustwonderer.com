import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Slot {
  id: string;
  product_id: string;
  starts_at: string;
  duration_min: number;
  status: string;
}

/** Open, future slots for a given booking product, soonest first. */
export async function listOpenSlots(admin: SupabaseClient, productId: string): Promise<Slot[]> {
  const { data } = await admin
    .from("availability_slots")
    .select("id, product_id, starts_at, duration_min, status")
    .eq("product_id", productId)
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  return (data ?? []) as Slot[];
}

/**
 * Atomically claim a slot: flips open -> booked only if still open.
 * Returns the slot row if we won the claim, else null (already taken).
 */
export async function claimSlot(admin: SupabaseClient, slotId: string): Promise<Slot | null> {
  const { data } = await admin
    .from("availability_slots")
    .update({ status: "booked" })
    .eq("id", slotId)
    .eq("status", "open")
    .select("id, product_id, starts_at, duration_min, status")
    .maybeSingle();
  return (data as Slot) ?? null;
}

export async function releaseSlot(admin: SupabaseClient, slotId: string): Promise<void> {
  await admin
    .from("availability_slots")
    .update({ status: "open", booking_id: null })
    .eq("id", slotId);
}
