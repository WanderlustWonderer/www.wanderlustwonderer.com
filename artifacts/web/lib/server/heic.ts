// Server-side HEIC/HEIF -> JPEG conversion using libheif (heic-convert).
// iPhones save photos as HEIF, which browsers cannot display. We convert on
// the server so it works regardless of what the browser managed to do.
import { Buffer } from "node:buffer";

const HEIF_BRANDS = ["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1", "heif"];

function isHeifBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf.toString("ascii", 4, 8) !== "ftyp") return false;
  const major = buf.toString("ascii", 8, 12).toLowerCase();
  if (HEIF_BRANDS.includes(major)) return true;
  const head = buf.toString("ascii", 12, Math.min(buf.length, 64)).toLowerCase();
  return HEIF_BRANDS.some((b) => head.includes(b));
}

/**
 * Returns a browser-displayable image. If the input is HEIC/HEIF it is
 * converted to JPEG; otherwise it is returned unchanged. On any conversion
 * failure it falls back to the original buffer rather than throwing, so an
 * upload never hard-fails because of conversion.
 */
export async function ensureWebImage(
  file: File,
  buf: Buffer,
): Promise<{ buffer: Buffer; ext: string; contentType: string }> {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  const looksHeif =
    type.includes("heic") || type.includes("heif") ||
    name.endsWith(".heic") || name.endsWith(".heif") || isHeifBuffer(buf);

  if (!looksHeif) {
    const ext = name.split(".").pop() || "jpg";
    return { buffer: buf, ext, contentType: file.type || "image/jpeg" };
  }

  try {
    const mod: any = await import("heic-convert");
    const convert = mod.default ?? mod;
    const out = await convert({ buffer: buf, format: "JPEG", quality: 0.92 });
    return { buffer: Buffer.from(out), ext: "jpg", contentType: "image/jpeg" };
  } catch {
    const ext = name.split(".").pop() || "heic";
    return { buffer: buf, ext, contentType: file.type || "image/heic" };
  }
}
