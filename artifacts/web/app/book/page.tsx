import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { listOpenSlots } from "@/lib/booking/slots";
import { BookingClient } from "./booking-client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book a Session", description: "Time with the Muse, live and private. 30-minute, hour and bespoke sessions." };


export default async function BookPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const { data: products } = await admin
    .from("products")
    .select("id, name, description, price, image_url")
    .eq("active", true)
    .eq("product_type", "booking")
    .order("price", { ascending: true });

  // Sessions the member has paid for but not yet scheduled (logged-in only).
  let owned: Array<{ id: string; product_id: string; product_name: string; slots: Awaited<ReturnType<typeof listOpenSlots>> }> = [];
  if (user) {
    const { data: ownedRows } = await admin
      .from("bookings")
      .select("id, product_id, products(name)")
      .eq("user_id", user.id)
      .is("scheduled_at", null)
      .order("created_at", { ascending: true });
    owned = await Promise.all(
      (ownedRows ?? []).map(async (b: { id: string; product_id: string; products: { name: string } | null }) => ({
        id: b.id,
        product_id: b.product_id,
        product_name: b.products?.name ?? "Session",
        slots: await listOpenSlots(admin, b.product_id),
      }))
    );
  }

  return (
    <div className="text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Sessions</h1>
          <p className="mt-3 opacity-70">Time with the Muse, live and private.</p>
        </header>
        {!user && (
          <div className="mx-auto mb-10 max-w-2xl rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 text-center">
            <p className="text-sm opacity-90">
              Sessions are open to everyone — guest or member. Just want to look around? <Link href="/signup" className="font-medium text-amber-400 underline">Create a free account</Link> — no card needed. Step inside, then book whenever you&apos;re ready.
            </p>
          </div>
        )}
        <BookingClient products={products ?? []} owned={owned} />
      </main>
      <SiteFooter />
    </div>
  );
}
