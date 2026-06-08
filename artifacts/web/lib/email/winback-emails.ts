// Winback email templates (Touch 1–4). Pure render functions — no sending here.
const SUBSCRIBE = "https://next-tailwind-wanderlustwndr.replit.app/subscribe";
const SIGNUP = "https://next-tailwind-wanderlustwndr.replit.app/signup";

const shell = (inner: string) => `
<div style="background:#08090a;color:#e7e7ea;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #232529">
  <div style="text-align:center;padding:34px 24px 8px">
    <div style="font-size:22px;letter-spacing:3px;color:#fff;font-weight:600">WANDERLUST WONDERER</div>
    <div style="font-size:11px;letter-spacing:4px;color:#e6b4c8;text-transform:uppercase;margin-top:6px">Mystery · Magic · Movement</div>
  </div>
  <div style="padding:14px 36px 30px;font-size:16px;line-height:1.65">${inner}</div>
  <div style="padding:18px 36px 28px;border-top:1px solid #232529;font-size:12px;color:#71757e;text-align:center">
    Wanderlust Wonderer · You're receiving this because you were a member.<br>
    <a href="#" style="color:#9aa0aa">Unsubscribe</a>
  </div>
</div>`;

const btn = (href: string, label: string) =>
  `<div style="text-align:center;margin:22px 0"><a href="${href}" style="display:inline-block;background:#e6b4c8;color:#08090a;text-decoration:none;font-weight:700;padding:14px 30px;border-radius:999px">${label}</a></div>`;

const freeLine = (text: string) =>
  `<p style="text-align:center;font-size:14px;color:#9aa0aa">${text} <a href="${SIGNUP}" style="color:#e6b4c8">come back free as a member</a> — no card needed.</p>`;

export type Touch = 1 | 2 | 3 | 4;

export function renderWinbackEmail(touch: Touch, name?: string | null): { subject: string; html: string } {
  const hi = name ? `${name},` : "";
  switch (touch) {
    case 1:
      return {
        subject: "The door reopened.",
        html: shell(`
          <h1 style="font-size:24px;color:#fff;margin:14px 0">I rebuilt my whole world. Come see. ${hi}</h1>
          <p>I went quiet for a reason. I tore the old thing down and rebuilt it from nothing — and this time, it's just us, directly.</p>
          <div style="background:#101113;border:1px solid #232529;border-radius:12px;padding:14px 18px;margin:18px 0;color:#cfcfd4">
            <div style="margin:6px 0">🔓 <b>Message me privately</b> — and I answer you myself.</div>
            <div style="margin:6px 0">📅 <b>Book real time with me</b> — live, one to one.</div>
            <div style="margin:6px 0">🗝️ <b>One door, everything behind it</b> — the full Vault, your account, all of it.</div>
          </div>
          <p>You were here before the world caught on. Come and see what it became.</p>
          ${btn(SUBSCRIBE, "Step back through the portal →")}
          ${freeLine("Not ready to commit?")}
        `),
      };
    case 2:
      return {
        subject: "Because you were here first.",
        html: shell(`
          <h1 style="font-size:24px;color:#fff;margin:14px 0">A welcome-back, just for you.</h1>
          <p>You can now message me directly, book live time, and step into the full Vault — none of which existed when you left.</p>
          <div style="text-align:center;background:rgba(230,180,200,.08);border:1px solid rgba(230,180,200,.35);border-radius:12px;padding:16px;margin:20px 0">
            <b style="color:#e6b4c8;font-size:18px">25% off — for as long as you stay.</b><br>
            <span style="font-size:13px;color:#9aa0aa">A permanent thank-you for being here before the world caught on.</span>
          </div>
          ${btn(SUBSCRIBE, "Claim my welcome-back →")}
          ${freeLine("Or")}
        `),
      };
    case 3:
      return {
        subject: "I left this open for you…",
        html: shell(`
          <h1 style="font-size:24px;color:#fff;margin:14px 0">Your seat's still warm.</h1>
          <p>This one's just from me. The moment you're back inside, your first message lands straight with me and I'll reply myself — and the first session is on me.</p>
          <p>Tell me when. I'll make the time.</p>
          ${btn(SUBSCRIBE, "Come back in →")}
          ${freeLine("Even just to look —")}
        `),
      };
    case 4:
      return {
        subject: "This is the last time I'll ask.",
        html: shell(`
          <h1 style="font-size:24px;color:#fff;margin:14px 0">The final door.</h1>
          <p>I won't keep knocking — it's not my style. But the door is open one more time, and your <b>first month back is half price</b> so there's nothing between you and everything I've built.</p>
          <div style="text-align:center;background:rgba(230,180,200,.08);border:1px solid rgba(230,180,200,.35);border-radius:12px;padding:16px;margin:20px 0">
            <b style="color:#e6b4c8;font-size:18px">50% off your first month.</b><br>
            <span style="font-size:13px;color:#9aa0aa">After this, the offer closes.</span>
          </div>
          ${btn(SUBSCRIBE, "Walk back through →")}
          ${freeLine("Even if not today —")}
        `),
      };
  }
}
