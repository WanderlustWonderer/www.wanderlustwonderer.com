import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin } from "@/lib/admin/guard";
import { NotesEditor } from "../notes-editor";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = { the_gallery: "Gallery", private_world: "Private World", all_access: "All Access" };
function gbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}
function date(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) notFound();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    if (aal?.nextLevel === "aal2") redirect("/mfa?next=/admin");
    redirect("/account?setup2fa=1");
  }

  const admin = createAdminClient();
  const [{ data: profile }, authRes, { data: orders }, { data: bookings }, { data: crypto }, { data: ledger }, { data: events }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", id).maybeSingle(),
    admin.auth.admin.getUserById(id),
    admin.from("orders").select("status, created_at, products(name, price, product_type)").eq("user_id", id).order("created_at", { ascending: false }),
    admin.from("bookings").select("status, scheduled_at, created_at, products(name, price)").eq("user_id", id).order("created_at", { ascending: false }),
    admin.from("crypto_payments").select("gbp_pence, tier, status, created_at").eq("profile_id", id),
    admin.from("credit_ledger").select("delta, reason, pot, created_at").eq("profile_id", id).order("created_at", { ascending: false }).limit(20),
    admin.from("analytics_events").select("event, props, created_at").eq("profile_id", id).order("created_at", { ascending: true }).limit(200),
  ]);

  if (!profile) notFound();
  const email = authRes?.data?.user?.email ?? (profile as any).email ?? "unknown";
  const tier = (profile as any).membership_tier as string | null;
  const status = (profile as any).subscription_status as string | null;
  const active = !!status && ["active", "trialing"].includes(status);

  const PAID = new Set(["paid", "complete", "completed", "succeeded"]);
  const paidOrders = (orders ?? []).filter((o: any) => PAID.has((o.status ?? "").toLowerCase()));
  const productSpend = paidOrders.reduce((s: number, o: any) => s + (o.products?.price ?? 0), 0);
  const sessionSpend = (bookings ?? []).filter((b: any) => PAID.has((b.status ?? "").toLowerCase()) || b.status === "confirmed").reduce((s: number, b: any) => s + (b.products?.price ?? 0), 0);
  const cryptoSpend = (crypto ?? []).filter((c: any) => c.status === "confirmed").reduce((s: number, c: any) => s + (c.gbp_pence ?? 0), 0);
  const creditBalance = (ledger ?? []).reduce((s: number, l: any) => s + (l.delta ?? 0), 0);
  const topups = (ledger ?? []).filter((l: any) => (l.reason ?? "").includes("purchase")).length;
  const totalSpend = productSpend + sessionSpend + cryptoSpend;

  const fanMsgs = (events ?? []).length; // proxy for activity
  const lastActive = (events ?? []).length ? (events as any[])[events!.length - 1].created_at : null;
  const firstTouch = (events ?? [])[0]?.props as any | undefined;
  const source = firstTouch?.utm_source || firstTouch?.ref || firstTouch?.referrer || "direct";

  const stat = (label: string, value: string) => (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <p className="text-[11px] uppercase tracking-wide text-neutral-300">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-100">{value}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/admin" className="text-sm text-neutral-300 hover:text-amber-400">← Back to admin</Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">{email}</h1>
            <p className="mt-1 text-sm text-neutral-300">
              {active && tier ? `${TIER_LABEL[tier] ?? tier} · active` : "Guest · no membership"} · joined {date((profile as any).created_at)} · last active {date(lastActive)}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-emerald-500/15 text-emerald-400" : "bg-neutral-800 text-neutral-300"}`}>
            {active && tier ? (TIER_LABEL[tier] ?? tier) : "Guest"}
          </span>
        </div>

        <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-widest text-neutral-200">Spend &amp; wallet</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stat("Lifetime spend", gbp(totalSpend))}
          {stat("Gifts / unlocks", gbp(productSpend))}
          {stat("Live sessions", gbp(sessionSpend))}
          {stat("Credit balance", String(creditBalance))}
        </div>
        <p className="mt-2 text-xs text-neutral-300">
          {topups} credit top-up{topups === 1 ? "" : "s"}{cryptoSpend ? ` · ${gbp(cryptoSpend)} via crypto` : ""} · acquired via <span className="text-amber-400">{source}</span> · {fanMsgs} tracked actions
        </p>

        <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-widest text-neutral-200">Purchases</h2>
        <div className="space-y-2">
          {[...paidOrders.map((o: any) => ({ name: o.products?.name ?? "Item", price: o.products?.price ?? 0, when: o.created_at, kind: "Gift / unlock" })),
            ...(bookings ?? []).map((b: any) => ({ name: b.products?.name ?? "Session", price: b.products?.price ?? 0, when: b.created_at, kind: "Live session" }))]
            .sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, 12)
            .map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-2 text-sm">
                <span className="text-neutral-100">{p.name} <span className="text-neutral-300">· {p.kind}</span></span>
                <span className="text-neutral-300">{gbp(p.price)} · {date(p.when)}</span>
              </div>
            ))}
          {paidOrders.length === 0 && (bookings ?? []).length === 0 && <p className="text-sm text-neutral-300">No purchases yet.</p>}
        </div>

        <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-widest text-neutral-200">Notes</h2>
        <NotesEditor profileId={id} initial={(profile as any).admin_notes ?? ""} />
      </main>
    </div>
  );
}
