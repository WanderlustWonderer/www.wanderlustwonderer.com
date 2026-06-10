"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

function MfaChallenge() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") || "/account";
  // Only allow internal paths — never an absolute/external URL (open-redirect guard).
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";
  const [factorId, setFactorId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = (data?.totp ?? []).find((f) => f.status === "verified");
      if (!verified) { router.replace(next); return; }
      setFactorId(verified.id);
      setReady(true);
    })();
    /* eslint-disable-next-line */
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true); setError(null);
    try {
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr || !ch) throw cErr ?? new Error("Challenge failed");
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() });
      if (vErr) throw vErr;
      router.replace(next);
    } catch (e: any) {
      setError(e?.message ?? "That code wasn't right — try again.");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Two-step verification</h1>
          <p className="text-sm text-gray-500 mb-6">
            Enter the 6-digit code from your authenticator app to continue.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="123456"
              disabled={!ready}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-center text-2xl tracking-[0.5em] text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition"
            />
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <button type="submit" disabled={busy || code.length !== 6 || !ready}
              className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition">
              {busy ? "Verifying…" : "Verify"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={null}>
      <MfaChallenge />
    </Suspense>
  );
}
