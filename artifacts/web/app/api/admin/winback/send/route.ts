import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";
import { isAdmin } from "@/lib/admin/guard";
import { renderWinbackEmail, type Touch } from "@/lib/email/winback-emails";

export const runtime = "nodejs";

const FROM = process.env.WINBACK_FROM ?? "Wanderlust Wonderer <muse@send.wanderlustwonderer.com>";

/**
 * POST { touch:1-4, to?:string, test?:boolean, name?:string }
 * Admin only. Sends ONE winback email. `test:true` forces the recipient to the
 * admin's own email so previews never reach customers by accident.
 * Live sends require a Verified Resend domain.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  let body: { touch?: number; to?: string; test?: boolean; name?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_body" }, { status: 400 }); }
  const touch = body.touch as Touch;
  if (![1, 2, 3, 4].includes(touch)) return NextResponse.json({ error: "bad_touch" }, { status: 400 });

  // Safety: test mode always sends only to the signed-in admin.
  const to = body.test ? (user?.email as string) : body.to;
  if (!to) return NextResponse.json({ error: "no_recipient" }, { status: 400 });

  const { subject, html } = renderWinbackEmail(touch, body.name);
  // Test previews send from Resend's shared domain so they work before the
  // sending domain is verified (Resend restricts these to your own account email).
  const from = body.test ? "Wanderlust Wonderer <onboarding@resend.dev>" : FROM;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({ from, to, subject, html });
  if (error) return NextResponse.json({ error: String((error as { message?: string }).message ?? error) }, { status: 502 });
  return NextResponse.json({ ok: true, id: data?.id, to });
}
