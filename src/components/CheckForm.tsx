"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CampaignInput, PeriodMetrics } from "@/lib/metrics";
import { validatePeriod } from "@/lib/metrics";
import { CURRENCIES, decodePayload, encodePayload } from "@/lib/share";
import { SAMPLE_CAMPAIGNS, SAMPLE_LABEL } from "@/lib/sample";
import { CsvError, pairPeriods, parseMetaCsv } from "@/lib/csv";
import { readHistory, type HistoryItem } from "@/lib/history";
import { VerdictBadge } from "./ReportView";
import { track } from "@/lib/track";

type FieldKey = keyof PeriodMetrics;
type Draft = { id: string; name: string; previous: Record<FieldKey, string>; current: Record<FieldKey, string> };

const FIELDS: { key: FieldKey; label: string; hint: string; optional?: boolean }[] = [
  { key: "spend", label: "Amount spent", hint: "Total ad spend" },
  { key: "impressions", label: "Impressions", hint: "Times shown" },
  { key: "reach", label: "Reach", hint: "Unique people (for frequency)", optional: true },
  { key: "clicks", label: "Link clicks", hint: "Not 'clicks (all)'" },
  { key: "purchases", label: "Purchases", hint: "Website purchases" },
  { key: "revenue", label: "Purchase value", hint: "Purchases conversion value" },
];

let idSeq = 0;
const newId = () => `c${Date.now().toString(36)}${idSeq++}`;
const emptyPeriod = (): Record<FieldKey, string> => ({
  spend: "",
  impressions: "",
  reach: "",
  clicks: "",
  purchases: "",
  revenue: "",
});
const toDraft = (c: CampaignInput): Draft => {
  const p = (m: PeriodMetrics) =>
    Object.fromEntries(FIELDS.map((f) => [f.key, m[f.key] === undefined ? "" : String(m[f.key])])) as Record<
      FieldKey,
      string
    >;
  return { id: newId(), name: c.name, previous: p(c.previous), current: p(c.current) };
};
const emptyDraft = (n: number): Draft => ({
  id: newId(),
  name: n === 1 ? "My account" : `Campaign ${n}`,
  previous: emptyPeriod(),
  current: emptyPeriod(),
});

type FieldError = { period: "previous" | "current"; field?: FieldKey; message: string };

function parseDraft(d: Draft): { campaign?: CampaignInput; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const toPeriod = (rec: Record<FieldKey, string>, period: "previous" | "current"): PeriodMetrics => {
    const label = period === "previous" ? "Previous period" : "Current period";
    const out: Partial<PeriodMetrics> = {};
    for (const f of FIELDS) {
      const raw = rec[f.key].replace(/[,\s]/g, "");
      if (raw === "") {
        if (f.optional) continue;
        errors.push({ period, field: f.key, message: `${label}: ${f.label} is empty` });
        out[f.key] = NaN;
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n)) errors.push({ period, field: f.key, message: `${label}: ${f.label} isn't a number` });
      out[f.key] = n;
    }
    return out as PeriodMetrics;
  };
  const previous = toPeriod(d.previous, "previous");
  const current = toPeriod(d.current, "current");
  if (errors.length) return { errors };
  const campaign: CampaignInput = { name: d.name.trim() || "Untitled campaign", previous, current };
  const issues: FieldError[] = [
    ...validatePeriod(previous, "Previous period").map((i) => ({ period: "previous" as const, field: i.field as FieldKey, message: i.message })),
    ...validatePeriod(current, "Current period").map((i) => ({ period: "current" as const, field: i.field as FieldKey, message: i.message })),
  ];
  return issues.length ? { errors: issues } : { campaign, errors: [] };
}

export function CheckForm() {
  const router = useRouter();
  // Rendered client-only (see CheckFormLoader), so initial state can come straight from the URL and storage.
  const initial = useState(() => {
    const h = window.location.hash;
    if (h.length > 1) {
      try {
        return decodePayload(h);
      } catch {
        /* bad hash: start blank */
      }
    }
    return null;
  })[0];
  const [mode, setMode] = useState<"manual" | "csv">("manual");
  const [currency, setCurrency] = useState<string>(initial?.currency ?? "INR");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [drafts, setDrafts] = useState<Draft[]>(() => (initial ? initial.campaigns.map(toDraft) : [emptyDraft(1)]));
  const [errors, setErrors] = useState<Record<string, FieldError[]>>({});
  const [history] = useState<HistoryItem[]>(() => readHistory());
  const [submitting, setSubmitting] = useState(false);

  const loadSample = () => {
    setDrafts(SAMPLE_CAMPAIGNS.map(toDraft));
    setLabel(SAMPLE_LABEL);
    setCurrency("INR");
    setErrors({});
    setMode("manual");
    track("sample_loaded");
  };

  const update = (id: string, fn: (d: Draft) => Draft) =>
    setDrafts((ds) => ds.map((d) => (d.id === id ? fn(d) : d)));

  const go = (campaigns: CampaignInput[]) => {
    setSubmitting(true);
    const hash = encodePayload({ v: 1, currency, label: label.trim() || undefined, campaigns });
    track("check_run");
    router.push(`/report#${hash}`, { scroll: false });
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, FieldError[]> = {};
    const campaigns: CampaignInput[] = [];
    for (const d of drafts) {
      const r = parseDraft(d);
      if (r.errors.length) next[d.id] = r.errors;
      else if (r.campaign) campaigns.push(r.campaign);
    }
    setErrors(next);
    if (Object.keys(next).length) {
      const first = Object.keys(next)[0];
      document.getElementById(`campaign-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    go(campaigns);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]" data-clarity-mask="True">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Input method" className="inline-flex rounded-full border border-white/80 bg-card p-1">
            {(["manual", "csv"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  mode === m ? "bg-ink text-white" : "text-muted hover:text-ink"
                }`}
              >
                {m === "manual" ? "Type numbers" : "Upload CSV"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={loadSample}
            className="rounded-full border border-white/80 bg-card px-4 py-1.5 text-sm hover:border-ink"
          >
            Try sample data
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_160px]">
          <label className="block">
            <span className="text-sm font-medium">Report name <span className="text-muted">(optional)</span></span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
              placeholder="e.g. Week of 10 Nov vs 3 Nov"
              className="mt-1.5 w-full rounded-xl border border-white/80 bg-card px-3.5 py-2.5 outline-none focus:border-ink"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/80 bg-card px-3 py-2.5 outline-none focus:border-ink"
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        {mode === "manual" ? (
          <form onSubmit={submitManual} noValidate className="mt-6 space-y-5">
            {drafts.map((d, idx) => (
              <CampaignFields
                key={d.id}
                draft={d}
                index={idx}
                canRemove={drafts.length > 1}
                errors={errors[d.id]}
                onChange={(fn) => update(d.id, fn)}
                onRemove={() => setDrafts((ds) => ds.filter((x) => x.id !== d.id))}
              />
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDrafts((ds) => [...ds, emptyDraft(ds.length + 1)])}
                disabled={drafts.length >= 25}
                className="rounded-full border border-dashed border-muted/50 px-4 py-2 text-sm text-muted hover:border-ink hover:text-ink disabled:opacity-40"
              >
                + Add another campaign
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-ink px-6 py-3 font-medium text-white shadow-[0_10px_30px_rgb(10_30_60/0.15)] transition hover:bg-black disabled:opacity-60"
              >
                {submitting ? "Diagnosing…" : "Run the check →"}
              </button>
            </div>
            {Object.keys(errors).length > 0 && (
              <p role="alert" className="text-right text-sm text-pulse">
                Fix the highlighted fields above and run it again.
              </p>
            )}
          </form>
        ) : (
          <CsvImport onReady={go} submitting={submitting} />
        )}
      </div>

      <aside className="space-y-5 lg:pt-14">
        <div className="rounded-3xl border border-white/80 bg-card p-5 text-sm">
          <p className="font-semibold">Where to find these numbers</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-muted">
            <li>Open Meta Ads Manager → Campaigns.</li>
            <li>Set the date to the last 7 days and note the totals.</li>
            <li>Switch to the 7 days before that and note them again.</li>
            <li>Use the same attribution setting for both.</li>
          </ol>
          <p className="mt-3 text-muted">
            Need columns? <span className="text-ink">Columns → Customise</span>, then add Reach, Link clicks, Purchases and Purchases conversion value.
          </p>
        </div>
        {history.length > 0 && (
          <div className="rounded-3xl border border-white/80 bg-card p-5 text-sm">
            <p className="font-semibold">Your recent checks</p>
            <p className="text-xs text-muted">Saved in this browser only</p>
            <ul className="mt-3 space-y-2">
              {history.map((h) => (
                <li key={h.hash}>
                  <Link href={`/report#${h.hash}`} className="group block rounded-lg p-2 -m-2 hover:bg-paper">
                    <span className="flex items-center gap-2">
                      <VerdictBadge verdict={h.verdict} size="sm" />
                      <span className="truncate group-hover:underline">{h.label}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {new Date(h.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} ·{" "}
                      {h.campaigns} campaign{h.campaigns > 1 ? "s" : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function CampaignFields({
  draft,
  index,
  canRemove,
  errors,
  onChange,
  onRemove,
}: {
  draft: Draft;
  index: number;
  canRemove: boolean;
  errors?: FieldError[];
  onChange: (fn: (d: Draft) => Draft) => void;
  onRemove: () => void;
}) {
  const uid = useId();
  const hasErr = (period: "previous" | "current", f: (typeof FIELDS)[number]) =>
    errors?.some((e) => e.period === period && e.field === f.key) ?? false;
  return (
    <fieldset
      id={`campaign-${draft.id}`}
      className={`min-w-0 rounded-3xl border bg-card p-4 sm:p-5 ${errors?.length ? "border-pulse" : "border-white/80"}`}
    >
      <legend className="sr-only">Campaign {index + 1}</legend>
      <div className="flex items-center gap-3">
        <span className="tabular text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
        <input
          aria-label="Campaign name"
          value={draft.name}
          maxLength={120}
          onChange={(e) => onChange((d) => ({ ...d, name: e.target.value }))}
          className="min-w-0 flex-1 border-b border-transparent bg-transparent text-lg font-semibold outline-none focus:border-ink"
        />
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full px-2 py-1 text-sm text-muted hover:bg-paper hover:text-pulse"
            aria-label={`Remove ${draft.name}`}
          >
            Remove
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 items-center gap-x-3 gap-y-2 text-sm sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-y-2.5">
        <span className="hidden sm:block" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Previous period<span className="block font-normal normal-case tracking-normal">e.g. 8–14 Nov</span></span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Current period<span className="block font-normal normal-case tracking-normal">e.g. 15–21 Nov</span></span>
        {FIELDS.map((f) => (
          <div key={f.key} className="contents">
            <label htmlFor={`${uid}-${f.key}-p`} className="col-span-2 mt-2 leading-tight sm:col-span-1 sm:mt-0">
              <span className="font-medium">{f.label}</span>
              {f.optional && <span className="text-muted"> · optional</span>}
              <span className="block text-xs text-muted">{f.hint}</span>
            </label>
            {(["previous", "current"] as const).map((period) => (
              <input
                key={period}
                id={`${uid}-${f.key}-${period === "previous" ? "p" : "c"}`}
                inputMode="decimal"
                autoComplete="off"
                aria-label={`${f.label}, ${period === "previous" ? "previous period" : "current period"}`}
                aria-invalid={hasErr(period, f)}
                value={draft[period][f.key]}
                onChange={(e) =>
                  onChange((d) => ({ ...d, [period]: { ...d[period], [f.key]: e.target.value } }))
                }
                placeholder="0"
                className="w-full rounded-lg border border-line bg-paper/60 px-3 py-2 tabular tabular outline-none focus:border-ink focus:bg-white aria-[invalid=true]:border-pulse"
              />
            ))}
          </div>
        ))}
      </div>

      {errors?.length ? (
        <ul role="alert" className="mt-4 space-y-1 rounded-lg bg-pulse-soft px-3 py-2 text-sm text-pulse">
          {errors.slice(0, 4).map((e) => (
            <li key={e.message}>{e.message}</li>
          ))}
          {errors.length > 4 && <li>…and {errors.length - 4} more highlighted field{errors.length - 4 > 1 ? "s" : ""}</li>}
        </ul>
      ) : null}
    </fieldset>
  );
}

function CsvImport({ onReady, submitting }: { onReady: (c: CampaignInput[]) => void; submitting: boolean }) {
  const [files, setFiles] = useState<{ previous?: File; current?: File }>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ campaigns: CampaignInput[]; warnings: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (key: "previous" | "current", file: File) => {
    const next = { ...files, [key]: file };
    setFiles(next);
    setResult(null);
    setError(null);
    if (!next.previous || !next.current) return;
    setBusy(true);
    try {
      for (const f of [next.previous, next.current]) {
        if (f.size > 5 * 1024 * 1024) throw new CsvError(`${f.name} is over 5 MB. Export at campaign level, not ad level.`);
      }
      const [p, c] = await Promise.all([next.previous.text(), next.current.text()]);
      setResult(pairPeriods(parseMetaCsv(p), parseMetaCsv(c)));
    } catch (e) {
      setError(e instanceof CsvError ? e.message : "We couldn't read that file. Make sure it's a CSV export from Ads Manager.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {(["previous", "current"] as const).map((k) => (
          <FileDrop
            key={k}
            label={k === "previous" ? "Previous period export" : "Current period export"}
            hint={k === "previous" ? "e.g. 8 to 14 Nov" : "e.g. 15 to 21 Nov"}
            file={files[k]}
            onFile={(f) => handleFile(k, f)}
          />
        ))}
      </div>
      <p className="text-sm text-muted">
        In Ads Manager, select your date range, then Reports → Export table data → CSV. Do it once per period.{" "}
        <a href="/advitals-template.csv" download className="text-ink underline underline-offset-2">
          Download a template
        </a>
        .
      </p>
      {busy && <p className="text-sm text-muted">Reading files…</p>}
      {error && (
        <p role="alert" className="rounded-lg bg-pulse-soft px-4 py-3 text-sm text-pulse">
          {error}
        </p>
      )}
      {result && (
        <div className="rounded-3xl border border-white/80 bg-card p-5">
          <p className="font-semibold">
            {result.campaigns.length} campaign{result.campaigns.length > 1 ? "s" : ""} matched across both periods
          </p>
          {result.warnings.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-warn">
              {result.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          )}
          <button
            onClick={() => onReady(result.campaigns)}
            disabled={submitting}
            className="mt-4 rounded-full bg-ink px-6 py-3 font-medium text-white transition hover:bg-black disabled:opacity-60"
          >
            {submitting ? "Diagnosing…" : "Run the check →"}
          </button>
        </div>
      )}
    </div>
  );
}

function FileDrop({
  label,
  hint,
  file,
  onFile,
}: {
  label: string;
  hint: string;
  file?: File;
  onFile: (f: File) => void;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
        over ? "border-pulse bg-pulse-soft/50" : file ? "border-ok bg-ok-soft/40" : "border-line bg-card hover:border-muted"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className="mt-1 text-sm text-muted">{file ? `✓ ${file.name}` : `${hint} · drop or click`}</span>
      <input
        id={id}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}
