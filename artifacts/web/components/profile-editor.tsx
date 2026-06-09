"use client";

import { useRef, useState } from "react";
import { toUploadable } from "@/components/heic-convert";

export function ProfileEditor({
  initialName, initialBio, initialAvatar, email,
}: { initialName: string; initialBio: string; initialAvatar: string | null; email: string }) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileObj = useRef<File | null>(null);

  function onChoose(f: File | null) {
    fileObj.current = f;
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("displayName", name);
      fd.append("bio", bio);
      if (fileObj.current) {
        const prepared = await toUploadable(fileObj.current);
        fd.append("avatar", prepared);
      }
      const res = await fetch("/api/account/profile", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setMsg("Couldn't save — try again."); return; }
      if (data.avatar_url) setAvatar(data.avatar_url);
      setPreview(null); fileObj.current = null;
      setMsg("Saved ✓");
      setTimeout(() => setMsg(null), 2000);
    } catch { setMsg("Something went wrong — try again."); }
    finally { setBusy(false); }
  }

  const shown = preview ?? avatar;
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div className="flex flex-col items-center gap-2">
        <div className="h-24 w-24 overflow-hidden rounded-full border border-neutral-700 bg-neutral-900">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="Your avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-amber-500/70">✦</div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onChoose(e.target.files?.[0] ?? null)} />
        <button onClick={() => fileRef.current?.click()} className="text-xs text-amber-400 underline hover:text-amber-300">
          {shown ? "Change photo" : "Add a photo"}
        </button>
      </div>
      <div className="flex-1">
        <label className="text-xs uppercase tracking-wide text-neutral-400">Display name</label>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder={email.split("@")[0]} maxLength={60}
          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500" />
        <label className="mt-4 block text-xs uppercase tracking-wide text-neutral-400">About you</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 500))} rows={3} maxLength={500}
          placeholder="Tell the Muse a little about yourself — what drew you here, what you're into. She'll remember."
          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500" />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-neutral-600">{bio.length}/500 · helps her personalise your chats</span>
          <div className="flex items-center gap-3">
            {msg && <span className="text-xs text-amber-400">{msg}</span>}
            <button onClick={save} disabled={busy} className="rounded-full bg-amber-500 px-5 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50">
              {busy ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
