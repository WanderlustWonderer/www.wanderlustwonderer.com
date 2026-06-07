"use client";

import { useState } from "react";

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing" }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="text-sm text-accent">
        You&rsquo;re on the list. Watch your inbox. ✨
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 rounded-full border border-line bg-panel px-5 py-3 text-sm text-fg placeholder:text-mute outline-none focus:border-accent transition"
      />
      <button type="submit" disabled={state === "loading"} className="btn-primary">
        {state === "loading" ? "…" : "Notify me"}
      </button>
      {state === "error" && (
        <span className="self-center text-xs text-red-400">Try again</span>
      )}
    </form>
  );
}
