"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { maybeSendLifecycle } from "@/lib/email/lifecycle-send";

function safeNext(v: FormDataEntryValue | null): string | null {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : null;
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  const next = safeNext(formData.get("next")) ?? "/account";
  // If this account has a verified second factor, require it before continuing.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  revalidatePath("/", "layout");
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/mfa?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const consented = formData.get("consent") === "on";
  if (!consented) {
    return { error: "You must confirm you are 18 or older to create an account." };
  }
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { age_confirmed_at: new Date().toISOString() },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Let new fans start immediately: auto-confirm the email (lazy verification)
  // and sign them in, so cold traffic never has to leave the site to click a
  // confirmation link before they can chat.
  try {
    const admin = createAdminClient();
    if (data.user && !data.user.email_confirmed_at) {
      await admin.auth.admin.updateUserById(data.user.id, { email_confirm: true });
    }
    await supabase.auth.signInWithPassword({ email, password });
  } catch {
    /* If auto sign-in fails, the account still exists; they can log in. */
  }

  // Gated: no-op until LIFECYCLE_EMAILS_ENABLED=1 + verified domain are set.
  await maybeSendLifecycle("welcome", email, email.split("@")[0]);

  revalidatePath("/", "layout");
  const next = safeNext(formData.get("next")) ?? "/chat";
  redirect(next);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
