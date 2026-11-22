import Link from "next/link";
import { Kicker } from "@/components/Kicker";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <Kicker>404 · Flatline</Kicker>
      <h1 className="mt-3 display text-5xl">No pulse on this page</h1>
      <p className="mt-3 text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="rounded-full border border-white/80 bg-card px-5 py-2.5 text-sm">Home</Link>
        <Link href="/check" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white">Run a check</Link>
      </div>
    </div>
  );
}
