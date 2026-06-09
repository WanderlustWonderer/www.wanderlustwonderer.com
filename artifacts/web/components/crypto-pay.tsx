"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Quote = {
  reference: string;
  solAmount: number;
  recipient: string;
  gbpPence: number;
  payUrl: string;
  expiresAt: string;
  tierName: string;
};

type Phase = "idle" | "loading" | "await" | "confirmed" | "expired" | "error";

declare global { interface Window { QRCode?: new (el: HTMLElement, opts: Record<string, unknown>) => unknown } }

function useQrScript() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.QRCode) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, []);
  return ready;
}

export function CryptoPay({ tier }: { tier: string }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState("");
  const [left, setLeft] = useState(0);
  const [copied, setCopied] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);
  const qrReady = useQrScript();

  const startQuote = useCallback(async () => {
    setPhase("loading"); setErr("");
    try {
      const res = await fetch("/api/crypto/quote", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier }),
      });
      if (res.status === 401) { window.location.href = "/signup"; return; }
      const data = await res.json();
      if (!res.ok) { setErr(data.error === "price_unavailable" ? "Couldn't fetch the live SOL price — try again in a moment." : "Something went wrong creating your quote."); setPhase("error"); return; }
      setQuote(data); setPhase("await");
    } catch { setErr("Network error — please try again."); setPhase("error"); }
  }, [tier]);

  // Render QR when quote + script ready
  useEffect(() => {
    if (phase !== "await" || !quote || !qrReady || !qrRef.current || !window.QRCode) return;
    qrRef.current.innerHTML = "";
    new window.QRCode(qrRef.current, { text: quote.payUrl, width: 200, height: 200, colorDark: "#0a0a0a", colorLight: "#ffffff", correctLevel: 2 });
  }, [phase, quote, qrReady]);

  // Countdown
  useEffect(() => {
    if (phase !== "await" || !quote) return;
    const tick = () => {
      const ms = new Date(quote.expiresAt).getTime() - Date.now();
      setLeft(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, quote]);

  // Poll status
  useEffect(() => {
    if (phase !== "await" || !quote) return;
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/crypto/status?reference=${encodeURIComponent(quote.reference)}`, { cache: "no-store" });
        const data = await res.json();
        if (stop) return;
        if (data.status === "confirmed") { setPhase("confirmed"); return; }
        if (data.status === "expired") { setPhase("expired"); return; }
      } catch { /* keep polling */ }
      if (!stop) setTimeout(poll, 5000);
    };
    const t = setTimeout(poll, 4000);
    return () => { stop = true; clearTimeout(t); };
  }, [phase, quote]);

  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(what); setTimeout(() => setCopied(""), 1500); });
  };

  const launch = () => { setOpen(true); startQuote(); };
  const close = () => { setOpen(false); setPhase("idle"); setQuote(null); setErr(""); };

  return (
    <>
      <button onClick={launch} className="mt-2 block w-full text-center text-xs font-medium text-amber-400/80 underline underline-offset-4 hover:text-amber-300">
        or pay with crypto (SOL)
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={close}>
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-950 p-6 text-neutral-100" onClick={(e) => e.stopPropagation()}>
            <button onClick={close} aria-label="Close" className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-300">✕</button>

            {phase === "loading" && <p className="py-12 text-center text-sm text-neutral-400">Fetching the live SOL price…</p>}

            {phase === "error" && (
              <div className="py-8 text-center">
                <p className="text-sm text-rose-300">{err}</p>
                <button onClick={startQuote} className="mt-4 rounded-full border border-neutral-600 px-5 py-2 text-sm hover:border-amber-500">Try again</button>
              </div>
            )}

            {phase === "await" && quote && (
              <div>
                <h3 className="text-lg font-semibold">Pay with Solana</h3>
                <p className="mt-1 text-sm text-neutral-400">{quote.tierName} membership · 30 days access</p>

                <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
                  <p className="text-3xl font-semibold text-amber-300">{quote.solAmount} SOL</p>
                  <p className="mt-1 text-xs text-neutral-400">≈ £{(quote.gbpPence / 100).toFixed(0)} · rate locked for {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</p>
                </div>

                <div ref={qrRef} className="mx-auto mt-5 flex h-[200px] w-[200px] items-center justify-center rounded-lg bg-white" />
                <p className="mt-2 text-center text-xs text-neutral-500">Scan with any Solana wallet (Phantom, Solflare…)</p>

                <div className="mt-4 space-y-2">
                  <a href={quote.payUrl} className="block w-full rounded-full bg-amber-500 px-5 py-3 text-center text-sm font-semibold text-black hover:bg-amber-400">Open in wallet</a>
                  <button onClick={() => copy(quote.recipient, "address")} className="block w-full truncate rounded-full border border-neutral-700 px-4 py-2 text-center text-xs text-neutral-300 hover:border-neutral-500">
                    {copied === "address" ? "Address copied ✓" : quote.recipient}
                  </button>
                  <button onClick={() => copy(String(quote.solAmount), "amount")} className="block w-full rounded-full border border-neutral-700 px-4 py-2 text-center text-xs text-neutral-300 hover:border-neutral-500">
                    {copied === "amount" ? "Amount copied ✓" : `Copy amount (${quote.solAmount} SOL)`}
                  </button>
                </div>

                <p className="mt-4 flex items-center justify-center gap-2 text-xs text-neutral-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" /> Watching the blockchain — access unlocks automatically once your payment confirms.
                </p>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-neutral-600">Send the exact amount to this address only. Crypto payments are final and grant 30 days — they don't auto-renew.</p>
              </div>
            )}

            {phase === "expired" && (
              <div className="py-8 text-center">
                <p className="text-sm text-neutral-300">This quote expired (the SOL price moves). Grab a fresh one to continue.</p>
                <button onClick={startQuote} className="mt-4 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-black hover:bg-amber-400">New quote</button>
              </div>
            )}

            {phase === "confirmed" && (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-3xl text-emerald-400">✓</div>
                <h3 className="mt-4 text-lg font-semibold">Payment confirmed</h3>
                <p className="mt-1 text-sm text-neutral-400">Welcome in. Your membership is active for the next 30 days.</p>
                <a href="/portal" className="mt-5 inline-block rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-400">Enter the portal</a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
