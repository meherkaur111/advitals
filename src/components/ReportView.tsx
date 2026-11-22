import type { Diagnosis, Finding, Report, Severity, Verdict } from "@/lib/diagnose";
import type { DerivedMetrics } from "@/lib/metrics";
import { change, money, num, rate, roas } from "@/lib/format";

const VERDICT: Record<Verdict, { label: string; cls: string; dot: string }> = {
  act: { label: "Act now", cls: "bg-pulse-soft text-pulse", dot: "bg-rose" },
  watch: { label: "Watch", cls: "bg-warn-soft text-warn", dot: "bg-warn" },
  healthy: { label: "Healthy", cls: "bg-ok-soft text-ok", dot: "bg-sky" },
};

const SEV: Record<Severity, { label: string; bar: string; chip: string }> = {
  critical: { label: "Critical", bar: "bg-rose", chip: "bg-pulse-soft text-pulse" },
  warning: { label: "Warning", bar: "bg-warn", chip: "bg-warn-soft text-warn" },
  good: { label: "Good", bar: "bg-sky", chip: "bg-ok-soft text-ok" },
  info: { label: "Note", bar: "bg-info", chip: "bg-info-soft text-info" },
};

export function VerdictBadge({ verdict, size = "md" }: { verdict: Verdict; size?: "sm" | "md" }) {
  const v = VERDICT[verdict];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium ${v.cls} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} aria-hidden="true" />
      {v.label}
    </span>
  );
}

function headline(d: Diagnosis): string {
  const p = d.previous.roas;
  const c = d.current.roas;
  const dec = d.decomposition;
  if (p === null || c === null) return "Not enough purchase data to compute ROAS for both periods.";
  const dir = c < p ? "fell" : c > p ? "rose" : "held";
  let s = `ROAS ${dir} from ${roas(p)} to ${roas(c)} (${change(c / p - 1)}).`;
  if (dec?.primary) s += ` The biggest drag: ${dec.primary.label.charAt(0).toLowerCase()}${dec.primary.label.slice(1)}.`;
  return s;
}

export function FindingCard({ f }: { f: Finding }) {
  const s = SEV[f.severity];
  return (
    <article className="print-break relative overflow-hidden rounded-3xl border border-white/80 bg-card p-5 pl-6">
      <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.chip}`}>{s.label}</span>
        <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{f.summary}</p>
      {f.evidence.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {f.evidence.map((e) => (
            <li key={e} className="rounded-md bg-paper px-2 py-1 tabular text-xs text-ink/80">
              {e}
            </li>
          ))}
        </ul>
      )}
      {f.actions.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">What to do</p>
          <ol className="mt-2 space-y-1.5 text-[15px]">
            {f.actions.map((a, i) => (
              <li key={a} className="flex gap-2.5">
                <span className="mt-0.5 tabular text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}

type Row = {
  key: keyof DerivedMetrics;
  label: string;
  hint: string;
  fmt: (v: number | null, cur: string) => string;
  /** +1 if higher is better, -1 if lower is better, 0 if neutral */
  good: 1 | -1 | 0;
};

const ROWS: Row[] = [
  { key: "spend", label: "Spend", hint: "Amount spent", fmt: (v, c) => money(v, c), good: 0 },
  { key: "impressions", label: "Impressions", hint: "Times ads were shown", fmt: (v, c) => num(v, 0, c), good: 0 },
  { key: "reach", label: "Reach", hint: "Unique people", fmt: (v, c) => num(v, 0, c), good: 0 },
  { key: "frequency", label: "Frequency", hint: "Impressions ÷ reach", fmt: (v) => num(v, 2), good: -1 },
  { key: "cpm", label: "CPM", hint: "Cost per 1,000 impressions", fmt: (v, c) => money(v, c, 2), good: -1 },
  { key: "ctr", label: "CTR", hint: "Clicks ÷ impressions", fmt: (v) => rate(v), good: 1 },
  { key: "cpc", label: "CPC", hint: "Cost per click", fmt: (v, c) => money(v, c, 2), good: -1 },
  { key: "cvr", label: "CVR", hint: "Purchases ÷ clicks", fmt: (v) => rate(v), good: 1 },
  { key: "cpa", label: "CPA", hint: "Cost per purchase", fmt: (v, c) => money(v, c, 0), good: -1 },
  { key: "aov", label: "AOV", hint: "Revenue ÷ purchases", fmt: (v, c) => money(v, c, 0), good: 1 },
  { key: "roas", label: "ROAS", hint: "Revenue ÷ spend", fmt: (v) => roas(v), good: 1 },
];

export function LabPanel({ d, currency }: { d: Diagnosis; currency: string }) {
  return (
    <div className="print-break overflow-hidden rounded-3xl border border-white/80 bg-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h3 className="font-semibold tracking-tight">Lab panel</h3>
        <span className="hidden text-xs text-muted sm:inline">Flagged when a metric moves 10%+ the wrong way</span>
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Metrics table">
        <table className="w-full text-[13px] sm:text-sm tabular">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-2.5 pl-3 pr-1 font-medium sm:px-4">Metric</th>
              <th className="px-3 py-2.5 text-right font-medium">Previous</th>
              <th className="px-3 py-2.5 text-right font-medium">Current</th>
              <th className="py-2.5 pl-2 pr-3 text-right font-medium sm:px-3">Change</th>
              <th className="hidden px-4 py-2.5 text-center font-medium sm:table-cell">Flag</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const ch = d.changes[r.key];
              const bad = ch !== null && r.good !== 0 && Math.abs(ch) >= 0.1 && Math.sign(ch) !== r.good;
              const good = ch !== null && r.good !== 0 && Math.abs(ch) >= 0.1 && Math.sign(ch) === r.good;
              const isKey = r.key === "roas";
              return (
                <tr key={r.key} className={`border-t border-line/70 ${isKey ? "bg-paper/60 font-semibold" : ""}`}>
                  <td className="py-2 pl-3 pr-1 sm:px-4">
                    <abbr title={r.hint} className="no-underline">{r.label}</abbr>
                    <span className="hidden text-xs font-normal text-muted sm:block">{r.hint}</span>
                  </td>
                  <td className="px-2 py-2 text-right tabular">{r.fmt(d.previous[r.key] as number | null, currency)}</td>
                  <td className="px-2 py-2 text-right tabular">{r.fmt(d.current[r.key] as number | null, currency)}</td>
                  <td
                    className={`py-2 pl-2 pr-3 text-right tabular sm:px-2 ${bad ? "text-pulse" : good ? "text-ok" : "text-muted"}`}
                  >
                    {change(ch)}
                  </td>
                  <td className="hidden px-4 py-2 text-center sm:table-cell">
                    {bad ? (
                      <span className="rounded bg-pulse-soft px-1.5 py-0.5 tabular text-xs font-semibold text-pulse">
                        {ch! > 0 ? "H" : "L"}
                      </span>
                    ) : good ? (
                      <span className="rounded bg-ok-soft px-1.5 py-0.5 tabular text-xs font-semibold text-ok">✓</span>
                    ) : (
                      <span className="text-line">·</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RoasBreakdown({ d }: { d: Diagnosis }) {
  const dec = d.decomposition;
  if (!dec) {
    return (
      <div className="rounded-3xl border border-white/80 bg-card p-5 text-sm text-muted">
        The ROAS breakdown needs at least one purchase in both periods.
      </div>
    );
  }
  const max = Math.max(0.05, ...dec.levers.map((l) => Math.abs(l.roasImpactPts)));
  return (
    <div className="print-break rounded-3xl border border-white/80 bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold tracking-tight">Where the ROAS change came from</h3>
        <span className={`tabular text-sm ${dec.roasChange < 0 ? "text-pulse" : "text-ok"}`}>
          Total {change(dec.roasChange)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">ROAS = (1000 ÷ CPM) × CTR × CVR × AOV. The four bars add up to the total.</p>
      <div className="mt-5 space-y-4">
        {dec.levers.map((l) => {
          const w = (Math.abs(l.roasImpactPts) / max) * 50;
          const neg = l.roasImpactPts < 0;
          return (
            <div key={l.lever}>
              <div className="flex items-baseline justify-between text-sm">
                <span>
                  {l.label}
                  <span className="ml-2 tabular text-xs text-muted">
                    {l.lever.toUpperCase()} {change(l.change)}
                  </span>
                </span>
                <span className={`tabular ${neg ? "text-pulse" : "text-ok"}`}>{change(l.roasImpactPts)}</span>
              </div>
              <div className="relative mt-1.5 h-2.5 rounded-full bg-paper" role="img" aria-label={`${l.label} effect on ROAS ${change(l.roasImpactPts)}`}>
                <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
                <span
                  className={`absolute inset-y-0 rounded-full ${neg ? "bg-rose" : "bg-sky"}`}
                  style={neg ? { right: "50%", width: `${w}%` } : { left: "50%", width: `${w}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {dec.primary && (
        <p className="mt-6 rounded-xl bg-paper px-4 py-3 text-sm">
          Read it as: if nothing else had changed, the move in {dec.primary.lever.toUpperCase()} alone would have shifted
          ROAS by <span className="tabular text-pulse">{change(dec.primary.roasImpactPts)}</span>.
        </p>
      )}
    </div>
  );
}

export function ReportView({
  report,
  currency,
  label,
}: {
  report: Report;
  currency: string;
  label?: string;
}) {
  const a = report.account;
  return (
    <div className="space-y-8" data-clarity-mask="True">
      <section className="rounded-3xl border border-white/80 bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <VerdictBadge verdict={a.verdict} />
          <span className="text-sm text-muted">
            {label ? `${label} · ` : ""}
            {report.campaigns.length > 1 ? `${report.campaigns.length} campaigns` : a.name}
          </span>
        </div>
        <h2 className="mt-4 display text-3xl leading-tight sm:text-4xl">{headline(a)}</h2>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Spend", money(a.current.spend, currency), change(a.changes.spend)],
            ["Revenue", money(a.current.revenue, currency), change(a.changes.revenue)],
            ["Purchases", num(a.current.purchases, 0, currency), change(a.changes.purchases)],
            ["CPA", money(a.current.cpa, currency), change(a.changes.cpa)],
          ].map(([k, v, c]) => (
            <div key={k} className="rounded-xl bg-paper px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-muted">{k}</dt>
              <dd className="mt-1 tabular text-lg tabular">{v}</dd>
              <dd className="tabular text-xs text-muted">{c} vs previous</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_1.1fr]">
        <RoasBreakdown d={a} />
        <LabPanel d={a} currency={currency} />
      </div>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {report.campaigns.length > 1 ? "Across the account" : "Diagnosis"}
        </h2>
        <div className="mt-4 space-y-4">
          {a.findings.map((f) => (
            <FindingCard key={f.id + f.title} f={f} />
          ))}
        </div>
      </section>

      {report.campaigns.length > 1 && (
        <section>
          <h2 className="text-xl font-semibold tracking-tight">By campaign</h2>
          <p className="mt-1 text-sm text-muted">
            Totals can hide problems. Each campaign is diagnosed on its own below.
          </p>
          <div className="mt-4 space-y-3">
            {report.campaigns.map((c) => (
              <CampaignRow key={c.name} d={c} currency={currency} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CampaignRow({ d, currency }: { d: Diagnosis; currency: string }) {
  const top = d.findings[0];
  return (
    <details className="group print-break rounded-3xl border border-white/80 bg-card open:pb-5">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <VerdictBadge verdict={d.verdict} size="sm" />
        <span className="min-w-0 flex-1 truncate font-medium">{d.name}</span>
        <span className="order-last w-full text-sm text-muted sm:order-none sm:w-auto">{top?.title}</span>
        <span className="tabular text-sm tabular">
          {roas(d.previous.roas)} → {roas(d.current.roas)}
        </span>
        <span className="text-muted transition group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="space-y-4 px-5">
        <div className="grid items-start gap-4 xl:grid-cols-[1fr_1.1fr]">
          <RoasBreakdown d={d} />
          <LabPanel d={d} currency={currency} />
        </div>
        {d.findings.map((f) => (
          <FindingCard key={f.id + f.title} f={f} />
        ))}
      </div>
    </details>
  );
}
