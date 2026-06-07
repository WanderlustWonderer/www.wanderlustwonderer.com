import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { CREATOR } from "@/config/creator";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: creator } = await admin
    .from("creators")
    .select("id")
    .eq("slug", CREATOR.slug)
    .single();
  if (!creator) return NextResponse.json({ error: "creator_missing" }, { status: 500 });

  await admin.from("email_leads").insert({
    creator_id: creator.id,
    email,
    source: body.source ?? "landing",
  });

  return NextResponse.json({ ok: true });
}
