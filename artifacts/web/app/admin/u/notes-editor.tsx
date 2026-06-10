"use client";
import { useState } from "react";

export function NotesEditor({ profileId, initial }: { profileId: string; initial: string }) {
  const [notes, setNotes] = useState(initial ?? "");
  const [state, setState] = useState<"idle" | "saving" | "done" | "err">("idle");
  async function save() {
    setState("saving");
    const r = await fetch("/api/admin/user-notes", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ profileId, notes }),
    });
    setState(r.ok ? "done" : "err");
    setTimeout(() => setState("idle"), 2500);
  }
  return (
    <div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
        placeholder="Notes about this member — what they like, what to offer, reminders…"
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500" />
      <div className="mt-2 flex items-center gap-3">
        <button onClick={save} disabled={state === "saving"} className="rounded-full bg-amber-500 px-5 py-2 text-sm font-medium text-black transition hover:bg-amber-400 disabled:opacity-50">
          {state === "saving" ? "Saving…" : "Save notes"}
        </button>
        {state === "done" && <span className="text-sm text-emerald-400">Saved ✓</span>}
        {state === "err" && <span className="text-sm text-red-400">Couldn't save</span>}
      </div>
    </div>
  );
}
