"use client";

import { useState } from "react";

interface Row { label: string; delta: number; created_at: string }
const PER_PAGE = 5;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function WalletHistory({ rows }: { rows: Row[] }) {
  const [page, setPage] = useState(0);
  if (!rows || rows.length === 0) return <p className="mt-3 text-sm opacity-50">No activity yet.</p>;
  const pages = Math.ceil(rows.length / PER_PAGE);
  const start = page * PER_PAGE;
  const slice = rows.slice(start, start + PER_PAGE);
  return (
    <div>
      <ul className="mt-4 divide-y divide-neutral-800">
        {slice.map((row, i) => (
          <li key={start + i} className="flex items-center justify-between py-3 text-sm">
            <div>
              <p className="font-medium">{row.label}</p>
              <p className="text-xs opacity-50">{fmtDate(row.created_at)}</p>
            </div>
            <span className={row.delta >= 0 ? "text-emerald-400" : "text-neutral-400"}>
              {row.delta >= 0 ? `+${row.delta}` : row.delta}
            </span>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs opacity-70">
          <span>Showing {start + 1}–{Math.min(start + PER_PAGE, rows.length)} of {rows.length}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="rounded-md border border-neutral-600 px-3 py-1 hover:border-amber-500 hover:text-amber-400 disabled:opacity-40">Prev</button>
            <span>Page {page + 1} / {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              className="rounded-md border border-neutral-600 px-3 py-1 hover:border-amber-500 hover:text-amber-400 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
