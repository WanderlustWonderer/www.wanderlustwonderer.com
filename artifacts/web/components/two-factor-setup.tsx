"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Status = "loading" | "disabled" | "enrolling" | "enabled";

export function TwoFactorSetup() {
  const supabase = createClient();
  const [status, setStatus] = useState<Status>("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) { setStatus("disabled"); return; }
    const verified = (data?.totp ?? []).find((f) => f.status === "verified");
    setStatus(verified ? "enabled" : "disabled");
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  async function startEnroll() {
    setError(null); setBusy(true);
    try {
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of (list?.totp ?? [])) {
        if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator " + Date.now(),
      });
      if (error || !data) throw error ?? new Error("Could not start setup");
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStatus("enrolling");
    } catch (e: any) {
      setError(e?.message ?? "Could not start setup. Two-step verification may not be enabled for this project.");
    } finally { setBusy(false); }
  }

  async function verifyCode() {
    if (!factorId) return;
    setError(null); setBusy(true);
    try {
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr || !ch) throw cErr ?? new Error("Challenge failed");
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() });
      if (vErr) throw vErr;
      setQr(null); setSecret(null); setCode(""); setStatus("enabled");
    } catch (e: any) { setError(e?.message ?? "That code wasn't right — try again."); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setError(null);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      for (const f of (data?.totp ?? [])) await supabase.auth.mfa.unenroll({ factorId: f.id });
      setStatus("disabled");
    } catch (e: any) { setError(e?.message ?? "Could not turn off two-step verification."); }
    finally { setBusy(false); }
  }

  return (
    <section className="mt-10 rounded-2xl border border-neutral-700 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Two-step verification</h2>
          <p className="mt-1 max-w-md text-sm text-neutral-400">
            Add a second layer of security with an authenticator app (Google
            Authenticator, Authy, 1Password). You&rsquo;ll enter a 6-digit code
            when you sign in.
          </p>
        </div>
        {status === "enabled" && (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> On
          </span>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      {status === "loading" && (
        <p className="mt-5 text-sm text-neutral-500">Checking your security settings…</p>
      )}

      {status === "disabled" && (
        <button onClick={startEnroll} disabled={busy}
          className="mt-5 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-medium tracking-wide text-black transition hover:bg-amber-400 disabled:opacity-50">
          {busy ? "Setting up…" : "Enable two-step verification"}
        </button>
      )}

      {status === "enrolling" && (
        <div className="mt-6 grid gap-6 sm:grid-cols-[auto,1fr] sm:items-start">
          {qr && (
            <div className="rounded-xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Scan this QR code with your authenticator app" className="h-44 w-44" />
            </div>
          )}
          <div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-300">
              <li>Open your authenticator app and scan the QR code.</li>
              <li>Can&rsquo;t scan? Enter this key manually:</li>
            </ol>
            {secret && (
              <code className="mt-2 block break-all rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs tracking-widest text-amber-300">
                {secret}
              </code>
            )}
            <label className="mt-4 block text-xs font-medium text-neutral-400">Enter the 6-digit code</label>
            <div className="mt-1 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="w-32 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-center text-lg tracking-[0.4em] text-neutral-100 outline-none focus:border-amber-500"
              />
              <button onClick={verifyCode} disabled={busy || code.length !== 6}
                className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-black transition hover:bg-amber-400 disabled:opacity-50">
                {busy ? "Verifying…" : "Verify & turn on"}
              </button>
            </div>
            <button onClick={() => { setStatus("disabled"); setError(null); }} className="mt-3 text-xs text-neutral-500 underline hover:text-neutral-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === "enabled" && (
        <button onClick={disable} disabled={busy}
          className="mt-5 rounded-full border border-neutral-600 px-6 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-red-500/50 hover:text-red-300 disabled:opacity-50">
          {busy ? "Working…" : "Turn off two-step verification"}
        </button>
      )}
    </section>
  );
}
