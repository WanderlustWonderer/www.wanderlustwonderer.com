import { Resend } from "resend";
import { renderWelcomeEmail, renderNewContentEmail } from "./lifecycle-emails";

type Kind = "welcome" | "new_content";

/**
 * Sends a lifecycle email ONLY when LIFECYCLE_EMAILS_ENABLED === "1" AND a
 * verified sending domain + API key are configured. Until then it no-ops and
 * returns { skipped: true } — so wiring a trigger can never send prematurely.
 */
export async function maybeSendLifecycle(
  kind: Kind, to: string, name?: string | null, teaser?: string
): Promise<{ sent: boolean; skipped?: string }> {
  if (process.env.LIFECYCLE_EMAILS_ENABLED !== "1") return { sent: false, skipped: "disabled" };
  if (!process.env.RESEND_API_KEY) return { sent: false, skipped: "no_api_key" };
  const from = process.env.LIFECYCLE_FROM ?? process.env.WINBACK_FROM;
  if (!from) return { sent: false, skipped: "no_from" };

  const { subject, html } = kind === "welcome"
    ? renderWelcomeEmail(name)
    : renderNewContentEmail(name, teaser ?? "");

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from, to, subject, html });
    return { sent: true };
  } catch {
    return { sent: false, skipped: "send_error" };
  }
}
