// Lifecycle email templates (welcome + new content). Pure render functions — no sending.
const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://next-tailwind-wanderlustwndr.replit.app";
const SUBSCRIBE = `${BASE}/subscribe`;
const PORTAL = `${BASE}/portal`;
const CHAT = `${BASE}/chat`;
const SIGNUP = `${BASE}/signup`;

const shell = (inner: string) => `
<div style="background:#070520;color:#e7e3f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #2a2466">
  <div style="text-align:center;padding:34px 24px 8px;background:linear-gradient(180deg,#0e0a33,#070520)">
    <div style="font-size:22px;letter-spacing:3px;color:#fff;font-weight:600">WANDERLUST WONDERER</div>
    <div style="font-size:11px;letter-spacing:4px;color:#ffc24b;text-transform:uppercase;margin-top:6px">Mystery · Magic · Movement</div>
  </div>
  <div style="padding:14px 36px 30px;font-size:16px;line-height:1.65">${inner}</div>
  <div style="padding:18px 36px 28px;border-top:1px solid #2a2466;font-size:12px;color:#9a93c8;text-align:center">
    Wanderlust Wonderer · 18+ members club.<br>
    <a href="#" style="color:#b8a9e8">Manage email preferences</a>
  </div>
</div>`;

const btn = (href: string, label: string) =>
  `<div style="text-align:center;margin:22px 0"><a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#ffe39a,#ff9a3d);color:#2a1500;text-decoration:none;font-weight:700;padding:14px 30px;border-radius:999px">${label}</a></div>`;

const freeLine =
  `<p style="text-align:center;font-size:14px;color:#9a93c8">Not a member yet? It's <a href="${SIGNUP}" style="color:#ffc24b">free to create an account</a> — 3 chat credits on us, no card needed.</p>`;

/** Sent right after someone creates a free account. */
export function renderWelcomeEmail(name?: string | null): { subject: string; html: string } {
  const hi = name ? ` ${name}` : "";
  return {
    subject: "Welcome through the portal ✦",
    html: shell(`
      <h1 style="font-size:24px;color:#fff;margin:14px 0">You're in${hi}.</h1>
      <p>Welcome to my world. You've got <b>3 free chat credits</b> waiting — come say something, I read every message myself.</p>
      <div style="background:#0e0a33;border:1px solid #2a2466;border-radius:12px;padding:14px 18px;margin:18px 0;color:#cfc9ee">
        <div style="margin:6px 0">💬 <b>Message me directly</b> in the chat.</div>
        <div style="margin:6px 0">🖼️ <b>Unlock content</b> across three tiers in The Portal.</div>
        <div style="margin:6px 0">📅 <b>Book live time</b> with me whenever you're ready.</div>
      </div>
      ${btn(CHAT, "Start chatting →")}
      <p style="text-align:center"><a href="${SUBSCRIBE}" style="color:#ffc24b">Or explore membership tiers →</a></p>
    `),
  };
}

/** Sent when fresh content drops, to existing members. */
export function renderNewContentEmail(name: string | null | undefined, teaser: string): { subject: string; html: string } {
  const hi = name ? ` ${name}` : "";
  return {
    subject: "New this week, just for you ✦",
    html: shell(`
      <h1 style="font-size:24px;color:#fff;margin:14px 0">Something new${hi}.</h1>
      <p>${teaser || "Fresh content just landed in The Portal — pictures, video and more, watermarked and just for members."}</p>
      ${btn(PORTAL, "See what's new →")}
      ${freeLine}
    `),
  };
}
