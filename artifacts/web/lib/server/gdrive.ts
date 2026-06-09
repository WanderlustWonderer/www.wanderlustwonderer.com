import "server-only";
import crypto from "node:crypto";

/**
 * Minimal Google Drive client using a service account (no SDK — raw JWT + REST,
 * matching the project's zero-dependency style). Configure via env:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — the full service-account JSON key
 *   GDRIVE_FOLDER_ID             — the Drive folder shared with the service account
 */
export interface DriveFile { id: string; name: string; mimeType: string; size?: string; thumbnailLink?: string; }

export function gdriveConfigured(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!process.env.GDRIVE_FOLDER_ID;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

async function getAccessToken(): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
  const key = JSON.parse(raw) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${claims}`;
  const signature = crypto.createSign("RSA-SHA256").update(signingInput).sign(key.private_key);
  const jwt = `${signingInput}.${b64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`Google token failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("No access_token from Google");
  return data.access_token;
}

/** List image/video files in the configured Drive folder (newest first). */
export async function listDriveFiles(): Promise<DriveFile[]> {
  const folderId = process.env.GDRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GDRIVE_FOLDER_ID not set");
  const token = await getAccessToken();
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,thumbnailLink)&orderBy=createdTime desc&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive list failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { files?: DriveFile[] };
  return data.files ?? [];
}

/** Download a Drive file's bytes. */
export async function downloadDriveFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string; name: string }> {
  const token = await getAccessToken();
  const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType&supportsAllDrives=true`, { headers: { authorization: `Bearer ${token}` } });
  const m = (await meta.json()) as { name?: string; mimeType?: string };
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive download failed (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mimeType: m.mimeType ?? "application/octet-stream", name: m.name ?? fileId };
}
