import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { listOpenSlots } from "@/lib/booking/slots";
import { BookingClient } from "./booking-client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };


export default async function BookPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/book");

  const admin = createAdminClient();

  const { data: products } = await admin
    .from("products")
    .select("id, name, description, price")
    .eq("active", true)
    .eq("product_type", "booking")
    .order("price", { ascending: true });

  // Sessions the member has paid for but not yet scheduled.
  const { data: ownedRows } = await admin
    .from("bookings")
    .select("id, product_id, products(name)")
    .eq("user_id", user.id)
    .is("scheduled_at", null)
    .order("created_at", { ascending: true });

  const owned = await Promise.all(
    (ownedRows ?? []).map(async (b: { id: string; product_id: string; products: { name: string } | null }) => ({
      id: b.id,
      product_id: b.product_id,
      product_name: b.products?.name ?? "Session",
      slots: await listOpenSlots(admin, b.product_id),
    }))
  );

  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Sessions</h1>
          <p className="mt-3 opacity-70">Time with the Muse, live and private.</p>
        </header>
        <BookingClient products={products ?? []} owned={owned} />
      </main>
      <SiteFooter />
    </div>
  );
}
