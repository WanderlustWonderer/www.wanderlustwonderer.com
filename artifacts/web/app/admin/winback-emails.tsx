"use client";

import { useState } from "react";

export function WinbackEmails({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false);
  if (emails.length === 0) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="mb-3 flex items-center gap-3">
      <button
        onClick={copy}
        className="rounded-md border border-amber-500/50 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/10"
      >
        {copied ? "Copied!" : `Copy ${emails.length} email${emails.length > 1 ? "s" : ""} for winback`}
      </button>
      <a
        href={`mailto:?bcc=${encodeURIComponent(emails.join(","))}`}
        className="text-xs text-neutral-300 underline hover:text-amber-400"
      >
        Open in mail app (BCC)
      </a>
    </div>
  );
}
