"use client";

import { useState } from "react";
import Link from "next/link";

const TIER_NAME: Record<string, string> = { the_gallery: "The Gallery", private_world: "Private World", all_access: "All Access" };
const TIER_PRICE: Record<string, number> = { the_gallery: 5500, private_world: 10000, all_access: 25000 };
function gbp(p: number) { return "£" + (p / 100).toLocaleString("en-GB", { minimumFractionDigits: p % 100 === 0 ? 0 : 2 }); }

export interface ManageProps {
  tier: string;
  status: string;
  renewal: string;       // formatted
  hasStripe: boolean;
  upgradeTiers: string[]; // higher tiers
  downgradeTiers: string[]; // lower tiers
  benefitsLost: string[];
}

export function ManageMembership(props: ManageProps) {
  const { tier, renewal, hasStripe, upgradeTiers, downgradeTiers, benefitsLost } = props;
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [step, setStep] = useState(0); // 0 = closed; 1..5 retention steps
  const [confirmText, setConfirmText] = useState("");

  async function upgrade(toTier: string) {
    setBusy("upgrade"); setNote(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier: toTier }) });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      setNote(data.error === "already_subscribed" ? "You're already on this plan." : "Couldn't start the upgrade — try again.");
    } catch { setNote("Something went wrong — try again."); }
    finally { setBusy(null); }
  }

  async function act(action: string, toTier?: string) {
    setBusy(action); setNote(null);
    try {
      const res = await fetch("/api/membership/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, toTier }) });
      const data = await res.json();
      if (!res.ok) { setNote(data.error === "no_stripe_subscription" ? "Your membership is managed manually — message me to make changes." : "Couldn't apply that — try again."); return; }
      setStep(0);
      setNote(data.message ?? "Done.");
      setTimeout(() => window.location.reload(), 1800);
    } catch { setNote("Something went wrong — try again."); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-8">
      {note && <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{note}</p>}

      {/* Current plan */}
      <div className="rounded-2xl border border-neutral-700 p-6">
        <p className="text-sm uppercase tracking-widest text-neutral-500">Current plan</p>
        <p className="mt-2 text-3xl font-semibold text-amber-500">{TIER_NAME[tier] ?? tier}</p>
        <p className="mt-1 text-sm text-neutral-400">{gbp(TIER_PRICE[tier] ?? 0)}/month · renews {renewal}</p>
        {hasStripe && (
          <a href="/api/stripe/portal" className="mt-4 inline-block text-xs text-neutral-400 underline hover:text-amber-400">Update payment method</a>
        )}
      </div>

      {/* Upgrades */}
      {upgradeTiers.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-neutral-500">Upgrade</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {upgradeTiers.map((t) => (
              <div key={t} className="rounded-2xl border border-neutral-700 p-5">
                <p className="text-lg font-semibold text-amber-400">{TIER_NAME[t]}</p>
                <p className="mt-1 text-sm text-neutral-400">{gbp(TIER_PRICE[t])}/month</p>
                <p className="mt-2 text-xs text-neutral-500">More content, more credits, deeper access.</p>
                <button onClick={() => upgrade(t)} disabled={busy !== null}
                  className="mt-4 w-full rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50">
                  {busy === "upgrade" ? "Opening…" : `Upgrade to ${TIER_NAME[t]}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel entry — deliberately low-key */}
      {hasStripe && (
        <div className="border-t border-neutral-800 pt-6">
          <button onClick={() => { setStep(1); setNote(null); }} className="text-xs text-neutral-600 underline hover:text-neutral-400">
            Cancel membership
          </button>
        </div>
      )}

      {/* ---- Retention funnel ---- */}
      {step > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-950 p-6">

            {step === 1 && (
              <>
                <h3 className="text-xl font-semibold">Wait — here's what you'd lose</h3>
                <ul className="mt-4 space-y-2 text-sm text-neutral-300">
                  {benefitsLost.map((b, i) => (
                    <li key={i} className="flex gap-2"><span className="text-amber-500">✦</span><span>{b}</span></li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-neutral-500">Your current price is locked in for as long as you stay. Leave, and you may pay more to rejoin later.</p>
                <div className="mt-6 flex flex-col gap-2">
                  <button onClick={() => setStep(0)} className="rounded-full bg-amber-500 px-4 py-2.5 text-sm font-medium text-black hover:bg-amber-400">Keep my membership</button>
                  <button onClick={() => setStep(2)} className="text-xs text-neutral-500 underline hover:text-neutral-300">No, continue cancelling</button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h3 className="text-xl font-semibold">Before you go — two ways to stay</h3>
                <p className="mt-3 text-sm text-neutral-300">I'd hate to lose you. Pick whichever suits you better:</p>

                <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
                  <p className="text-sm font-semibold text-amber-300">25% off your next 3 months</p>
                  <p className="mt-1 text-xs text-neutral-400">Same full access, a quarter off — applied automatically.</p>
                  <button onClick={() => act("discount")} disabled={busy !== null}
                    className="mt-3 w-full rounded-full bg-amber-500 px-4 py-2.5 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50">
                    {busy === "discount" ? "Applying…" : "Claim 25% off for 3 months"}
                  </button>
                </div>

                {downgradeTiers.length > 0 && (
                  <div className="mt-3 rounded-xl border border-neutral-700 p-4">
                    <p className="text-sm font-semibold">Switch to a lighter plan</p>
                    <p className="mt-1 text-xs text-neutral-400">Keep your spot for less instead of leaving.</p>
                    <div className="mt-3 space-y-2">
                      {downgradeTiers.map((t) => (
                        <button key={t} onClick={() => act("downgrade", t)} disabled={busy !== null}
                          className="flex w-full items-center justify-between rounded-lg border border-neutral-700 px-4 py-2.5 text-sm hover:border-amber-500 disabled:opacity-50">
                          <span className="font-medium text-amber-400">{TIER_NAME[t]}</span>
                          <span className="text-neutral-400">{gbp(TIER_PRICE[t])}/mo</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-2">
                  <button onClick={() => setStep(0)} className="rounded-full border border-neutral-700 px-4 py-2.5 text-sm hover:border-amber-500 hover:text-amber-400">Keep my membership as it is</button>
                  <button onClick={() => setStep(3)} className="text-xs text-neutral-500 underline hover:text-neutral-300">No thanks, continue cancelling</button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h3 className="text-xl font-semibold">Confirm cancellation</h3>
                <p className="mt-3 text-sm text-neutral-300">You'll keep full access until <span className="font-semibold">{renewal}</span>, then your membership ends and your locked-in price is gone.</p>
                <p className="mt-4 text-xs text-neutral-500">Type <span className="font-mono text-neutral-300">CANCEL</span> to confirm.</p>
                <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="CANCEL"
                  className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
                <div className="mt-5 flex flex-col gap-2">
                  <button onClick={() => setStep(0)} className="rounded-full bg-amber-500 px-4 py-2.5 text-sm font-medium text-black hover:bg-amber-400">Keep my membership</button>
                  <button onClick={() => act("cancel")} disabled={busy !== null || confirmText.trim().toUpperCase() !== "CANCEL"}
                    className="rounded-full border border-red-500/50 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-40">
                    {busy === "cancel" ? "Cancelling…" : "Cancel my membership"}
                  </button>
                </div>
              </>
            )}

            <button onClick={() => setStep(0)} className="mt-4 block w-full text-center text-[11px] text-neutral-600 hover:text-neutral-400">Close</button>
          </div>
        </div>
      )}

      <Link href="/account" className="inline-block text-sm text-neutral-400 underline hover:text-amber-400">← Back to account</Link>
    </div>
  );
}
