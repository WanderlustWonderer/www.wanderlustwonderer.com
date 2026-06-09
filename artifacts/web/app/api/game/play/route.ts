import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { balances } from "@/lib/wallet/ledger";

export const runtime = "nodejs";

const DAILY = Number(process.env.GAME_DAILY_PLAYS ?? 5); // plays allowed per day
const ODDS = Number(process.env.GAME_WIN_ODDS ?? 5);     // 1-in-ODDS chance per play
const WIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;             // hard cap: 1 free credit / 24h

/**
 * POST — play the waiting-room game once. Server decides the reward so it can't
 * be faked. HARD RULE: at most ONE free message credit per rolling 24 hours,
 * enforced against the credit ledger (the play cap is a secondary guard).
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const admin = createAdminClient();
  const now = Date.now();

  // 24h single-credit guard — has this member already won within the last 24h?
  const { data: lastWin } = await admin.from("credit_ledger")
    .select("created_at").eq("profile_id", user.id).eq("reason", "game_reward")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const lastWinAt = lastWin?.created_at ? new Date(lastWin.created_at).getTime() : 0;
  const wonRecently = lastWinAt > 0 && now - lastWinAt < WIN_COOLDOWN_MS;
  const nextWinInHours = wonRecently ? Math.ceil((WIN_COOLDOWN_MS - (now - lastWinAt)) / 3600000) : 0;

  // Daily play cap (stops endpoint spamming).
  const today = new Date().toISOString().slice(0, 10);
  const { data: row } = await admin.from("game_plays")
    .select("plays, credits_won").eq("profile_id", user.id).eq("played_on", today).maybeSingle();
  const plays = row?.plays ?? 0;
  if (plays >= DAILY) {
    const bal = await balances(admin, user.id);
    return NextResponse.json({ capped: true, playsToday: plays, cap: DAILY, balance: bal.total, alreadyWon: wonRecently, nextWinInHours });
  }

  const rolled = Math.floor(Math.random() * Math.max(2, ODDS)) === 0;
  const grant = rolled && !wonRecently; // never grant a 2nd credit inside 24h
  await admin.from("game_plays").upsert({
    profile_id: user.id, played_on: today, plays: plays + 1, credits_won: (row?.credits_won ?? 0) + (grant ? 1 : 0),
  });
  if (grant) {
    await admin.from("credit_ledger").insert({ profile_id: user.id, delta: 1, reason: "game_reward", pot: "purchased" });
  }
  const bal = await balances(admin, user.id);
  return NextResponse.json({
    won: grant, alreadyWon: wonRecently && !grant, capped: false,
    playsToday: plays + 1, cap: DAILY, balance: bal.total, nextWinInHours,
  });
}
