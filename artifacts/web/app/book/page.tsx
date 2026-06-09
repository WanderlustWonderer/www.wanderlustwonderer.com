import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { generateOpenStarts } from "@/lib/booking/availability";
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

  // Open times come from the default rule (Mon–Fri 4–9pm UK) minus already-booked times.
  const { data: booked } = await admin
    .from("availability_slots")
    .select("starts_at")
    .eq("status", "booked")
    .gt("starts_at", new Date().toISOString());
  const bookedSet = new Set((booked ?? []).map((b: { starts_at: string }) => new Date(b.starts_at).toISOString()));
  const availableStarts = generateOpenStarts(bookedSet);

  // Sessions the member has paid for but not yet scheduled (logged-in only).
  let owned: Array<{ id: string; product_name: string; starts: string[] }> = [];
  if (user) {
    const { data: ownedRows } = await admin
      .from("bookings")
      .select("id, product_id, products(name)")
      .eq("user_id", user.id)
      .is("scheduled_at", null)
      .order("created_at", { ascending: true });
    owned = (ownedRows ?? []).map((b: { id: string; products: { name: string } | null }) => ({
      id: b.id, product_name: b.products?.name ?? "Session", starts: availableStarts,
    }));
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
