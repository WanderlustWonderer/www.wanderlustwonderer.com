import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin allowlist. Set ADMIN_EMAILS (comma-separated) in env to control who
 * can see /admin. Falls back to the owner accounts so it works out of the box.
 */
const FALLBACK_ADMINS = [
  "liamjameshunter@hotmail.com",
  "wanderlustwonderer26@gmail.com",
];

export function adminEmails(): string[] {
  const env = process.env.ADMIN_EMAILS;
  const list = env ? env.split(",").map((e) => e.trim().toLowerCase()) : FALLBACK_ADMINS;
  return list.filter(Boolean);
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}


/**
 * Mandatory 2FA gate for admin actions. Admin *pages* already enforce AAL2;
 * this enforces it on the admin *API routes* too, so a password-only (AAL1)
 * session cannot drive admin mutations directly.
 */
export async function isAal2(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return data?.currentLevel === "aal2";
  } catch {
    return false;
  }
}
