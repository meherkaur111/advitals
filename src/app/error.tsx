"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Kicker } from "@/components/Kicker";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <Kicker>Something went wrong</Kicker>
      <h1 className="mt-3 display text-4xl">That didn&apos;t load properly</h1>
      <p className="mt-3 text-muted">Try again. If it keeps happening, start a fresh check.</p>
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={reset} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white">
          Try again
        </button>
        <Link href="/check" className="rounded-full border border-white/80 bg-card px-5 py-2.5 text-sm">New check</Link>
      </div>
    </div>
  );
}
