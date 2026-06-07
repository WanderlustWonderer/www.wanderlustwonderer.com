import "server-only";

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
