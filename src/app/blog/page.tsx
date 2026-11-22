import type { Metadata } from "next";
import Link from "next/link";
import { POSTS } from "@/lib/posts";
import { Kicker } from "@/components/Kicker";

export const metadata: Metadata = {
  title: "Guides: diagnosing Meta ads performance",
  description: "Practical guides to why Meta ads ROAS drops: creative fatigue, CPM spikes, conversion leaks and tracking breaks.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <Kicker>Guides</Kicker>
      <h1 className="mt-2 display text-5xl">Reading your ad vitals</h1>
      <p className="mt-3 text-muted">Short, practical guides to diagnosing Meta ads performance.</p>
      <ul className="mt-10 space-y-4">
        {POSTS.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} className="group block rounded-3xl border border-white/80 bg-card p-6 transition hover:border-ink">
              <p className="text-xs text-muted">
                {new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} ·{" "}
                {p.readMins} min read
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight group-hover:underline">{p.title}</h2>
              <p className="mt-2 text-muted">{p.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
