import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { sameSite: "none", secure: true, partitioned: true },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — can be ignored
            // if you have middleware refreshing user sessions
          }
        },
      },
    }
  );
}

// Single source of truth for the service-role client (see utils/supabase/admin.ts).
export { createAdminClient } from "./admin";
