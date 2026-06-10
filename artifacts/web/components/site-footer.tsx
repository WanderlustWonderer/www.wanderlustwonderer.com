import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0826]/40 backdrop-blur-md text-neutral-400">
      <div className="mx-auto max-w-3xl px-6 py-14 text-center space-y-6">
        <p className="text-lg font-semibold tracking-[0.2em] uppercase text-neutral-100">
          Wanderlust Wonderer
        </p>
        <p className="text-sm">
          © 2026 Wanderlust Wonderer · <span className="text-amber-400">Unfiltered | Unrestricted</span>
        </p>
        <Link href="/subscribe" className="block text-sm italic leading-relaxed hover:text-amber-400 transition">
          The Mystery Remains — As the stars align for 2026, the distance between us remains
          absolute. Follow the trail of gold dust and remain silent in your devotion. The
          adventure is mine; the privilege of witnessing it is yours.
        </Link>
        <div className="flex justify-center gap-6 text-xs tracking-[0.25em]">
          <a href="https://www.instagram.com/wanderlust_wonderer/" className="hover:text-amber-400">INSTAGRAM</a>
          <a href="https://www.tiktok.com/@dailyyogadiary" className="hover:text-amber-400">TIKTOK</a>
          <a href="https://www.facebook.com/WanderlustWonderer/" className="hover:text-amber-400">FACEBOOK</a>
          <Link href="/faq" className="hover:text-amber-400">FAQ</Link>
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] tracking-wider text-neutral-500">
          <Link href="/terms" className="hover:text-amber-400">Terms</Link>
          <Link href="/privacy" className="hover:text-amber-400">Privacy</Link>
          <span className="text-neutral-600">·</span>
          <span>18+ only. All persons depicted are 18 or older.</span>
        </div>
      </div>
    </footer>
  );
}
