import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin, isAal2 } from "@/lib/admin/guard";
import { CREATOR } from "@/config/creator";

export const runtime = "nodejs";

function fmtWhen(iso: string | null): string {
  if (!iso) return "your chosen time";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London",
    }) + " (UK time)";
  } catch { return iso; }
}

function escapeHtml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function safeHttpsUrl(u: string | null): string | null {
  if (!u) return null;
  try { const p = new URL(u); return p.protocol === "https:" ? p.href : null; } catch { return null; }
}

async function sendConfirmation(to: string, sessionName: string, whenIso: string | null, meetingUrl: string | null): Promise<string> {
  if (!process.env.RESEND_API_KEY) return "no_api_key";
  const from = process.env.BOOKING_FROM ?? process.env.LIFECYCLE_FROM ?? process.env.WINBACK_FROM;
  if (!from) return "no_from";
  const when = fmtWhen(whenIso);
  const safeLink = safeHttpsUrl(meetingUrl);
  const link = safeLink
    ? `<p>Your private link to join: <a href="${escapeHtml(safeLink)}">${escapeHtml(safeLink)}</a></p>`
    : `<p>Your private link to join will follow before we begin.</p>`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:auto;color:#111">
      <h2 style="font-weight:600">Your session is confirmed ✨</h2>
      <p>It's official — I've accepted your booking.</p>
      <p><strong>${sessionName}</strong><br/>${when}</p>
      ${link}
      <p>Can't wait to see you there.</p>
      <p>— ${CREATOR.displayName}</p>
    </div>`;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from, to, subject: `Your session is confirmed — ${sessionName} ✨`, html });
    return "sent";
  } catch { return "send_error"; }
}

/**
 * POST { bookingId, action?: "accept", meetingUrl? }
 * - action "accept": mark the paid booking confirmed and email the member.
 * - otherwise: attach/replace the meeting link.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  if (!(await isAal2(supabase))) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  let body: { bookingId?: string; action?: string; meetingUrl?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.bookingId) return NextResponse.json({ error: "missing_booking" }, { status: 400 });
  const admin = createAdminClient();

  if (body.action === "accept") {
    const { data: bk } = await admin.from("bookings")
      .select("id, user_id, scheduled_at, meeting_url, product_id")
      .eq("id", body.bookingId).maybeSingle();
    if (!bk) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { data: prod } = await admin.from("products").select("name").eq("id", bk.product_id).maybeSingle();
    let email: string | null = null;
    try {
      const { data: u } = await admin.auth.admin.getUserById(bk.user_id);
      email = u.user?.email ?? null;
    } catch { /* fall through */ }

    await admin.from("bookings").update({ status: "confirmed" }).eq("id", bk.id);

    let emailStatus = "no_email";
    if (email) emailStatus = await sendConfirmation(email, prod?.name ?? "Your session", bk.scheduled_at, bk.meeting_url);
    return NextResponse.json({ ok: true, emailStatus });
  }

  await admin.from("bookings").update({ meeting_url: body.meetingUrl ?? null }).eq("id", body.bookingId);
  return NextResponse.json({ ok: true });
}
