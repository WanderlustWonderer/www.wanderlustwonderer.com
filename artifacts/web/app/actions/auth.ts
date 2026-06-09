"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { maybeSendLifecycle } from "@/lib/email/lifecycle-send";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const consented = formData.get("consent") === "on";
  const email = formData.get("email") as string;
  const { error } = await supabase.auth.signUp({
    email,
    password: formData.get("password") as string,
    options: {
      data: consented ? { age_confirmed_at: new Date().toISOString() } : {},
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Gated: no-op until LIFECYCLE_EMAILS_ENABLED=1 + verified domain are set.
  await maybeSendLifecycle("welcome", email, email.split("@")[0]);

  revalidatePath("/", "layout");
  redirect("/confirm-email");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
