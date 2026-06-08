"use client";

/**
 * iPhones save photos as HEIC/HEIF, which browsers cannot display. Convert any
 * HEIC/HEIF File to JPEG in the browser before upload so creators can upload
 * straight from their phone. JPEG/PNG/etc. pass through unchanged.
 */
let loader: Promise<any> | null = null;
function loadHeic2Any(): Promise<any> {
  if (typeof window !== "undefined" && (window as any).heic2any) return Promise.resolve((window as any).heic2any);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
      s.onload = () => resolve((window as any).heic2any);
      s.onerror = () => reject(new Error("heic2any failed to load"));
      document.head.appendChild(s);
    });
  }
  return loader;
}

function isHeic(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  const n = (file.name || "").toLowerCase();
  return t.includes("heic") || t.includes("heif") || n.endsWith(".heic") || n.endsWith(".heif");
}

export async function toUploadable(file: File): Promise<File> {
  if (!isHeic(file)) return file;
  const heic2any = await loadHeic2Any();
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const blob: Blob = Array.isArray(out) ? out[0] : out;
  const name = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

export async function allUploadable(files: File[]): Promise<File[]> {
  return Promise.all(files.map(toUploadable));
}
