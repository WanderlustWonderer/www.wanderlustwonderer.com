"use client";

import { useState } from "react";
import { track } from "@/components/analytics";

export function CheckoutButton({
  kind,
  itemKey,
  label,
  featured = false,
}: {
  kind: "subscription" | "credits";
  itemKey: string;
  label: string;
  featured?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    track(kind === "credits" ? "credits_checkout_started" : "checkout_started", { key: itemKey });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, key: itemKey }),
      });
      if (res.status === 401) {
        window.location.href = "/signup";
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={go} disabled={loading} className={featured ? "btn-primary w-full" : "btn-ghost w-full"}>
        {loading ? "Opening checkout…" : label}
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
