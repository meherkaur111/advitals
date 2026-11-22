import Link from "next/link";
import { Ecg } from "@/components/Ecg";
import { Kicker } from "@/components/Kicker";
import { FindingCard, RoasBreakdown, VerdictBadge } from "@/components/ReportView";
import { buildReport } from "@/lib/diagnose";
import { roas } from "@/lib/format";
import { SAMPLE_CAMPAIGNS, SAMPLE_LABEL } from "@/lib/sample";
import { encodePayload } from "@/lib/share";
import { SITE } from "@/lib/site";

const sampleHash = encodePayload({ v: 1, currency: "INR", label: SAMPLE_LABEL, campaigns: SAMPLE_CAMPAIGNS });
const sample = buildReport(SAMPLE_CAMPAIGNS, new Date("2026-11-21T00:00:00Z"));
const sampleCampaign = sample.campaigns[0];

const CONDITIONS = [
  { t: "Creative fatigue", d: "CTR falls while the same people see your ads again and again.", sig: "CTR ↓ · Frequency ↑" },
  { t: "Auction pressure", d: "You pay more per impression but your ads still work. A market problem, not a creative one.", sig: "CPM ↑ · CTR steady" },
  { t: "Post-click leak", d: "People still click, but fewer buy. Look at stock, price, speed and the landing page.", sig: "CVR ↓ · CTR steady" },
  { t: "Tracking break", d: "Clicks hold but recorded purchases collapse. Often a broken pixel, not lost buyers.", sig: "CVR ↓↓ · CTR steady" },
  { t: "Audience saturation", d: "Frequency is high, reach has stalled and costs climb. Your budget outgrew your audience.", sig: "Freq > 3.5 · Reach flat" },
  { t: "Smaller baskets", d: "Orders keep coming, but each is worth less. Check discounts and product mix.", sig: "AOV ↓" },
];

const FAQ = [
  {
    q: "Is my ad data uploaded anywhere?",
    a: "No. AdVitals runs the whole diagnosis in your browser. Share links carry the numbers in the part of the URL after the #, which browsers never send to a server.",
  },
  {
    q: "Do I need to connect my Meta ad account?",
    a: "No login and no account access. Type in totals from Ads Manager, or upload two CSV exports, one per date range.",
  },
  {
    q: "How does it decide what's wrong?",
    a: "ROAS is the product of four levers: cost per impression, click-through rate, conversion rate and order value. AdVitals measures how much each lever moved your ROAS, checks whether CTR and conversion changes are statistically real, then matches the pattern to known causes.",
  },
  {
    q: "How much data do I need?",
    a: "It works with any numbers, but conclusions are firmer with at least 100 link clicks and 10 purchases per period. Below that, the report tells you which changes might just be noise.",
  },
  { q: "Is it free?", a: "Yes. Run as many checks as you like." },
];

export default function Home() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: SITE.description,
      url: SITE.url,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Hero: full-bleed glass gradient, centred white type, like the portfolio */}
      <section className="hero-bg -mt-20 overflow-hidden text-white">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-32 text-center sm:pt-40">
          <Kicker tone="dark">For D2C founders and performance marketers</Kicker>
          <h1 className="display mx-auto mt-6 max-w-4xl text-5xl sm:text-7xl">
            Your ROAS dropped.
            <br />
            Find out why in 60 seconds.
          </h1>
          <p className="mt-4 text-[15px] text-white/80">(ROAS = attention cost × clicks × conversion × basket)</p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90">
            AdVitals reads two weeks of Meta Ads numbers and tells you whether it&apos;s creative fatigue, rising costs, a
            leaky landing page or a broken pixel, and what to do about each. No login. Your data never leaves your browser.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/check"
              className="rounded-full bg-white px-6 py-3.5 font-medium text-ink shadow-[0_10px_30px_rgb(10_30_60/0.18)] transition hover:bg-white/90"
            >
              Run a free check →
            </Link>
            <Link href={`/report#${sampleHash}`} className="glass-dark rounded-full px-6 py-3.5 font-medium text-white transition hover:bg-white/25">
              See a sample report
            </Link>
          </div>

          {/* Live preview built from the sample report */}
          <div className="glass-dark mx-auto mt-14 max-w-2xl rounded-3xl p-3 text-left sm:p-4">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/60" aria-hidden="true" />
            <ul className="space-y-2">
              {sample.campaigns.map((c) => (
                <li key={c.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-white/85 px-4 py-3 text-ink">
                  <VerdictBadge verdict={c.verdict} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                  <span className="text-sm text-muted">{c.findings[0]?.title}</span>
                  <span className="tabular text-sm">
                    {roas(c.previous.roas)} → {roas(c.current.roas)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-center text-xs text-white/80">Sample diagnosis · skincare brand · last 7 days vs previous 7</p>
          </div>
          <Ecg className="mt-10 h-16 w-full sm:h-24" />
        </div>
      </section>

      {/* The idea */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <Kicker>The idea</Kicker>
            <h2 className="display mt-4 text-4xl sm:text-5xl">
              ROAS is a symptom, <span className="text-gradient">not a diagnosis.</span>
            </h2>
            <p className="mt-5 text-lg text-muted">
              When ROAS falls, most teams refresh creative by reflex. But ROAS is four numbers multiplied together, and
              each one breaks for a different reason with a different fix. New creative won&apos;t fix a broken checkout.
              Cutting budget won&apos;t fix festive-season CPMs.
            </p>
          </div>
          <div className="rounded-3xl border border-white/80 bg-card p-6 sm:p-8">
            <p className="text-center text-base font-medium text-muted">
              ROAS = <span className="text-ink">1000 ÷ CPM</span> × <span className="text-ink">CTR</span> ×{" "}
              <span className="text-ink">CVR</span> × <span className="text-ink">AOV</span>
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                ["CPM", "What attention costs", "Market & auction"],
                ["CTR", "Do people click?", "Creative & targeting"],
                ["CVR", "Do clickers buy?", "Site, offer, tracking"],
                ["AOV", "How much per order?", "Pricing & product mix"],
              ].map(([k, q, w]) => (
                <div key={k} className="rounded-2xl bg-paper/80 p-4">
                  <p className="text-gradient text-xl font-semibold">{k}</p>
                  <p className="mt-1 text-sm font-medium">{q}</p>
                  <p className="text-xs text-muted">{w}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-24 mx-auto max-w-6xl px-5 py-12">
        <Kicker>How it works</Kicker>
        <h2 className="display mt-4 text-4xl sm:text-5xl">
          Three steps, <span className="text-gradient">no integrations.</span>
        </h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ["Pull two periods", "Last 7 days and the 7 before, from Ads Manager. Type the totals or upload two CSV exports."],
            ["We split the change", "Your ROAS change is broken into the exact share caused by cost, clicks, conversion and basket size. CTR and conversion swings are tested for statistical significance."],
            ["Get the fix", "A verdict, the likeliest cause and a short action list for each campaign. Share the link with your team or save it as a PDF."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-3xl border border-white/80 bg-card p-6">
              <span className="bg-gradient-brand inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Conditions */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Kicker>What it catches</Kicker>
        <h2 className="display mt-4 text-4xl sm:text-5xl">
          Six conditions, <span className="text-gradient">six different fixes.</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONDITIONS.map((c) => (
            <div key={c.t} className="rounded-3xl border border-white/80 bg-card p-6">
              <span className="inline-block rounded-full bg-pulse-soft px-2.5 py-0.5 text-xs font-medium text-pulse">{c.sig}</span>
              <h3 className="mt-3 text-lg font-semibold">{c.t}</h3>
              <p className="mt-1.5 text-sm text-muted">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sample */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Kicker>From a sample report</Kicker>
            <h2 className="display mt-4 text-4xl sm:text-5xl">
              What you <span className="text-gradient">get back.</span>
            </h2>
          </div>
          <Link
            href={`/report#${sampleHash}`}
            className="rounded-full border border-white/80 bg-white/80 px-5 py-2.5 text-sm font-medium transition hover:bg-white"
          >
            Open the full sample →
          </Link>
        </div>
        <div className="mt-5 flex items-center gap-3 text-sm text-muted">
          <VerdictBadge verdict={sampleCampaign.verdict} size="sm" /> {sampleCampaign.name}
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <RoasBreakdown d={sampleCampaign} />
          <FindingCard f={sampleCampaign.findings[0]} />
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Private by design", "The diagnosis runs in your browser. No ad-account access, no uploads, no database of your numbers."],
            ["Honest about noise", "Small samples swing. A two-proportion z-test separates real CTR and conversion changes from random wobble."],
            ["Explainable", "Every verdict shows its evidence and the thresholds behind it, so you can argue with it."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-3xl border border-white/80 bg-card p-6">
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-8">
        <h2 className="display text-4xl sm:text-5xl">Questions</h2>
        <div className="mt-6 divide-y divide-line overflow-hidden rounded-3xl border border-white/80 bg-card">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="text-xl text-muted transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-2 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pt-16">
        <div className="hero-bg overflow-hidden rounded-[32px] px-6 py-16 text-center text-white sm:px-12">
          <h2 className="display text-4xl sm:text-6xl">Stop guessing what broke.</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
            Two weeks of numbers in, a clear diagnosis out. Free, private and done in about a minute.
          </p>
          <Link
            href="/check"
            className="mt-8 inline-block rounded-full bg-white px-7 py-3.5 font-medium text-ink shadow-[0_10px_30px_rgb(10_30_60/0.18)] hover:bg-white/90"
          >
            Run a free check →
          </Link>
        </div>
      </section>
    </>
  );
}
