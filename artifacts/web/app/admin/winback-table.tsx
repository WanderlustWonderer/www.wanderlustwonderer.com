"use client";

import { useState } from "react";

interface Row {
  subId: string; email: string | null; name: string | null;
  product: string; amountGbp: number; interval: string; status: string;
  canceledAt: string | null; created: string;
}

const PER_PAGE = 10;

function gbp(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}
function date(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function WinbackTable({ rows }: { rows: Row[] }) {
  // Rows arrive already sorted by most recent cancellation (server-side).
  const [page, setPage] = useState(0);
  if (rows.length === 0) return <p className="text-sm text-neutral-500">No cancellations yet.</p>;

  const pages = Math.ceil(rows.length / PER_PAGE);
  const start = page * PER_PAGE;
  const slice = rows.slice(start, start + PER_PAGE);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Previous plan</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Cancelled</th>
              <th className="px-4 py-3">Since</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {slice.map((r) => (
              <tr key={r.subId} className="hover:bg-neutral-900/50">
                <td className="px-4 py-3">{r.email ?? "—"}</td>
                <td className="px-4 py-3">{r.name ?? "—"}</td>
                <td className="px-4 py-3">{r.product}</td>
                <td className="px-4 py-3 font-medium text-amber-400">{gbp(r.amountGbp)}<span className="text-neutral-500">/{r.interval}</span></td>
                <td className="px-4 py-3"><span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400">{r.status}</span></td>
                <td className="px-4 py-3">{date(r.canceledAt)}</td>
                <td className="px-4 py-3 text-neutral-500">{date(r.created)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>Showing {start + 1}–{Math.min(start + PER_PAGE, rows.length)} of {rows.length}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="rounded-md border border-neutral-700 px-3 py-1 hover:border-amber-500 hover:text-amber-400 disabled:opacity-40">Prev</button>
            <span>Page {page + 1} / {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              className="rounded-md border border-neutral-700 px-3 py-1 hover:border-amber-500 hover:text-amber-400 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
