import Link from "next/link";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="no-print mt-24 px-3 pb-6">
      <div className="mx-auto grid max-w-6xl gap-8 rounded-3xl border border-white/80 bg-white/60 px-6 py-8 text-sm text-muted backdrop-blur-xl sm:grid-cols-[1fr_auto] sm:px-8">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm">Your numbers are processed in your browser and never stored on our servers.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 sm:justify-end">
          <Link href="/check" className="hover:text-ink">Run a check</Link>
          <Link href="/blog" className="hover:text-ink">Guides</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <a href={SITE.authorUrl} className="hover:text-ink" target="_blank" rel="noopener noreferrer">
            Built by {SITE.author} ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
