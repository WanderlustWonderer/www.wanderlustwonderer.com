"use client";

import { useState } from "react";
import { ProtectedMedia } from "@/components/protected-media";

export interface FeedMedia { kind: string; url: string; }
export interface FeedItem {
  id: string; min_tier: string; live: boolean; title: string; caption?: string | null; media: FeedMedia[];
}

const TIER_NAME: Record<string, string> = { the_gallery: "The Gallery", private_world: "Private World", all_access: "All Access" };
const TIER_ORDER = ["the_gallery", "private_world", "all_access"];

export function PortalFeed({ items, watermark }: { items: FeedItem[]; watermark: string }) {
  const tiersPresent = TIER_ORDER.filter((t) => items.some((i) => i.min_tier === t));
  const [active, setActive] = useState<string>("all");

  const shown = active === "all" ? items : items.filter((i) => i.min_tier === active);

  return (
    <div className="space-y-6">
      {tiersPresent.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {["all", ...tiersPresent].map((t) => {
            const label = t === "all" ? "All levels" : (TIER_NAME[t] ?? t);
            const count = t === "all" ? items.length : items.filter((i) => i.min_tier === t).length;
            const on = active === t;
            return (
              <button
                key={t}
                onClick={() => setActive(t)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  on ? "border-amber-500 bg-amber-500 text-black" : "border-neutral-700 text-neutral-300 hover:border-amber-500/60 hover:text-amber-400"
                }`}
              >
                {label} <span className={on ? "text-black/60" : "text-neutral-500"}>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 p-10 text-center text-neutral-400">
          <p>Nothing at this level yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {shown.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-neutral-800">
              <div className="flex items-center justify-between px-5 pt-4 text-xs">
                <span className="rounded-full border border-amber-500/40 px-2.5 py-0.5 uppercase tracking-wide text-amber-400">{TIER_NAME[item.min_tier] ?? item.min_tier}</span>
                {!item.live && <span className="text-neutral-500">from the Vault</span>}
              </div>
              <div className="px-5 pt-3">
                <h2 className="text-xl font-semibold">{item.title}</h2>
                {item.caption && <p className="mt-1 text-sm text-neutral-400">{item.caption}</p>}
              </div>
              <div className="mt-3 grid gap-1 p-2 sm:grid-cols-2">
                {item.media.map((m, i) => (
                  <ProtectedMedia key={i} kind={m.kind} url={m.url} alt={item.title} watermark={watermark} />
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
