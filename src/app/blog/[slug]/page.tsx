import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS, getPost, type Block } from "@/lib/posts";
import { SITE } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.description, publishedTime: post.date },
  };
}

function Render({ b }: { b: Block }) {
  switch (b.type) {
    case "h2":
      return <h2 className="mt-10 text-2xl font-semibold tracking-tight">{b.text}</h2>;
    case "p":
      return <p className="mt-4">{b.text}</p>;
    case "ul":
      return (
        <ul className="mt-4 list-disc space-y-2 pl-5 marker:text-pulse">
          {b.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      );
    case "formula":
      return (
        <p className="my-6 rounded-3xl border border-white/80 bg-card px-5 py-4 text-center tabular text-[15px]">{b.text}</p>
      );
    case "callout":
      return <p className="my-6 border-l-4 border-pulse bg-pulse-soft/50 px-5 py-4">{b.text}</p>;
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Person", name: SITE.author, url: SITE.authorUrl },
    mainEntityOfPage: `${SITE.url}/blog/${post.slug}`,
  };

  return (
    <article className="mx-auto max-w-2xl px-5 py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/blog" className="text-sm text-muted hover:text-ink">← All guides</Link>
      <h1 className="mt-4 display text-4xl leading-tight sm:text-5xl">{post.title}</h1>
      <p className="mt-3 text-sm text-muted">
        {SITE.author} · {new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} ·{" "}
        {post.readMins} min read
      </p>
      <div className="mt-8 text-[17px] leading-relaxed text-ink/90">
        {post.body.map((b, i) => (
          <Render key={i} b={b} />
        ))}
      </div>
      <div className="hero-bg mt-12 rounded-3xl p-8 text-white">
        <p className="display text-3xl">Check your own account</p>
        <p className="mt-2 text-white/85">Two weeks of numbers in, a diagnosis out. Free and private.</p>
        <Link href="/check" className="mt-5 inline-block rounded-full bg-white px-6 py-3 font-medium text-ink">
          Run a free check →
        </Link>
      </div>
    </article>
  );
}
