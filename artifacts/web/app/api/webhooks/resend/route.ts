import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/** Verify Svix-style signature used by Resend webhooks. */
function verify(secret: string, headers: Headers, body: string): boolean {
  try {
    const id = headers.get("svix-id");
    const ts = headers.get("svix-timestamp");
    const sigHeader = headers.get("svix-signature");
    if (!id || !ts || !sigHeader) return false;
    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const expected = crypto.createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
    return sigHeader.split(" ").some((p) => p.split(",")[1] === expected);
  } catch {
    return false;
  }
}

/**
 * Resend webhook: records delivery/open/click/bounce events against the
 * winback target by recipient email. Events selected in Resend dashboard:
 * email.delivered, email.opened, email.clicked, email.bounced, email.complained.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  // Fail closed: never process unsigned/unverified webhook events.
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!verify(secret, req.headers, body)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  let evt: { type?: string; data?: { to?: string | string[] } };
  try { evt = JSON.parse(body); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }

  const type = evt.type ?? "";
  const toRaw = Array.isArray(evt.data?.to) ? evt.data?.to[0] : evt.data?.to;
  const to = toRaw?.toLowerCase();
  if (!to) return NextResponse.json({ ok: true });

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { email: to, updated_at: now };
  if (type === "email.delivered") patch.delivered_at = now;
  else if (type === "email.opened") patch.opened_at = now;
  else if (type === "email.clicked") patch.clicked_at = now;
  else if (type === "email.bounced" || type === "email.complained") patch.bounced = true;
  else return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  await admin.from("winback_targets").upsert(patch, { onConflict: "email" });
  return NextResponse.json({ ok: true });
}
