import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { balances } from "@/lib/wallet/ledger";

export const runtime = "nodejs";

const DAILY = Number(process.env.GAME_DAILY_PLAYS ?? 5); // plays allowed per day
const ODDS = Number(process.env.GAME_WIN_ODDS ?? 5);     // 1-in-ODDS wins a free message

/**
 * POST — play the waiting-room game once. Server decides the (rate-limited)
 * 1-in-N reward so it can't be farmed from the client. A win grants 1 message credit.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: row } = await admin.from("game_plays")
    .select("plays, credits_won").eq("profile_id", user.id).eq("played_on", today).maybeSingle();
  const plays = row?.plays ?? 0;

  if (plays >= DAILY) {
    const bal = await balances(admin, user.id);
    return NextResponse.json({ capped: true, playsToday: plays, cap: DAILY, balance: bal.total });
  }

  const won = Math.floor(Math.random() * Math.max(2, ODDS)) === 0;
  await admin.from("game_plays").upsert({
    profile_id: user.id, played_on: today, plays: plays + 1, credits_won: (row?.credits_won ?? 0) + (won ? 1 : 0),
  });
  if (won) {
    await admin.from("credit_ledger").insert({ profile_id: user.id, delta: 1, reason: "game_reward", pot: "purchased" });
  }
  const bal = await balances(admin, user.id);
  return NextResponse.json({ won, capped: false, playsToday: plays + 1, cap: DAILY, balance: bal.total });
}
