import Link from "next/link";
import { Logo } from "./Logo";

/** Floating glass pill nav, like the portfolio's. */
export function SiteHeader() {
  return (
    <header className="no-print fixed inset-x-0 top-3 z-30 px-3 sm:top-4">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-3xl items-center justify-between gap-2 rounded-full border border-white/80 bg-white/70 py-1.5 pl-4 pr-1.5 shadow-[0_10px_30px_rgb(10_30_60/0.08)] backdrop-blur-xl"
      >
        <Link href="/" aria-label="AdVitals home" className="shrink-0">
          <Logo />
        </Link>
        <div className="flex items-center gap-0.5 text-sm">
          <Link href="/#how" className="hidden rounded-full px-3 py-2 text-ink/70 transition hover:bg-ink/5 hover:text-ink sm:block">
            How it works
          </Link>
          <Link href="/blog" className="rounded-full px-3 py-2 text-ink/70 transition hover:bg-ink/5 hover:text-ink">
            Guides
          </Link>
          <Link
            href="/check"
            className="ml-1 whitespace-nowrap rounded-full bg-ink px-4 py-2 font-medium text-white transition hover:bg-black"
          >
            Run a check ↗
          </Link>
        </div>
      </nav>
    </header>
  );
}
