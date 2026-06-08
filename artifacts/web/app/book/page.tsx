import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { listOpenSlots } from "@/lib/booking/slots";
import { BookingClient } from "./booking-client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

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

  const withSlots = await Promise.all(
    (products ?? []).map(async (p) => ({ ...p, slots: await listOpenSlots(admin, p.id) }))
  );

  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Book a session</h1>
          <p className="mt-3 opacity-70">Choose a time to spend with the Muse, live.</p>
        </header>
        <BookingClient products={withSlots} />
      </main>
      <SiteFooter />
    </div>
  );
}
