"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-neutral-100">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-3xl text-black">✦</div>
      <h1 className="font-display text-3xl font-semibold">Something slipped out of alignment</h1>
      <p className="mt-3 max-w-sm text-sm text-neutral-400">A momentary disturbance in the cosmos. Try again — it usually passes.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn-primary">Try again</button>
        <a href="/" className="btn-ghost">Return home</a>
      </div>
    </div>
  );
}
