import Papa from "papaparse";
import type { CampaignInput, PeriodMetrics } from "./metrics";

/**
 * Parse a Meta Ads Manager CSV export. Column names differ by account,
 * currency and export settings, so we match by normalised header aliases.
 */

type Field = keyof PeriodMetrics | "name";

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // drop "(INR)", "(USD)"
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Ordered by preference: the first alias that exists wins.
const ALIASES: Record<Field, string[]> = {
  name: ["campaign name", "ad set name", "ad name", "campaign", "name"],
  spend: ["amount spent", "spend", "cost"],
  impressions: ["impressions"],
  reach: ["reach"],
  clicks: ["link clicks", "clicks all", "clicks"],
  purchases: ["website purchases", "purchases", "meta pixel purchase", "purchase"],
  revenue: [
    "website purchases conversion value",
    "purchases conversion value",
    "purchase conversion value",
    "conversion value",
    "revenue",
  ],
};

export interface ParsedPeriod {
  rows: Map<string, PeriodMetrics>;
  warnings: string[];
}

export class CsvError extends Error {}

function toNumber(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  const s = String(raw).replace(/[,\s₹$€£]/g, "").trim();
  if (s === "" || s === "-" || s === "—") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function mapHeaders(headers: string[]): { map: Partial<Record<Field, string>>; missing: Field[] } {
  const normalised = headers.map((h) => ({ raw: h, n: norm(h) }));
  const map: Partial<Record<Field, string>> = {};
  for (const field of Object.keys(ALIASES) as Field[]) {
    for (const alias of ALIASES[field]) {
      const hit = normalised.find((h) => h.n === alias);
      if (hit) {
        map[field] = hit.raw;
        break;
      }
    }
  }
  const required: Field[] = ["name", "spend", "impressions", "clicks", "purchases", "revenue"];
  return { map, missing: required.filter((f) => !map[f]) };
}

const LABEL: Record<Field, string> = {
  name: "Campaign name",
  spend: "Amount spent",
  impressions: "Impressions",
  reach: "Reach",
  clicks: "Link clicks",
  purchases: "Purchases",
  revenue: "Purchases conversion value",
};

export function parseMetaCsv(text: string): ParsedPeriod {
  const cleaned = text.replace(/^﻿/, "");
  const res = Papa.parse<Record<string, string>>(cleaned, { header: true, skipEmptyLines: "greedy" });
  if (!res.meta.fields || res.meta.fields.length < 2) {
    throw new CsvError("This doesn't look like a CSV with column headers.");
  }
  const { map, missing } = mapHeaders(res.meta.fields);
  if (missing.length) {
    throw new CsvError(
      `Missing column${missing.length > 1 ? "s" : ""}: ${missing.map((m) => LABEL[m]).join(", ")}. ` +
        "In Ads Manager, add these columns before exporting, or use the template.",
    );
  }

  const rows = new Map<string, PeriodMetrics>();
  const warnings: string[] = [];
  if (!map.reach) warnings.push("No Reach column, so frequency (and fatigue detection) will be limited.");

  res.data.forEach((r, i) => {
    const name = String(r[map.name!] ?? "").trim();
    if (!name || /^total/i.test(name)) return; // Meta adds summary rows
    const m: PeriodMetrics = {
      spend: toNumber(r[map.spend!]),
      impressions: toNumber(r[map.impressions!]),
      reach: map.reach ? toNumber(r[map.reach]) : undefined,
      clicks: toNumber(r[map.clicks!]),
      purchases: toNumber(r[map.purchases!]),
      revenue: toNumber(r[map.revenue!]),
    };
    if (Object.values(m).some((v) => typeof v === "number" && Number.isNaN(v))) {
      warnings.push(`Row ${i + 2} ("${name}") has a value that isn't a number and was skipped.`);
      return;
    }
    // Same name twice (e.g. a breakdown export): add them up.
    const prev = rows.get(name);
    rows.set(
      name,
      prev
        ? {
            spend: prev.spend + m.spend,
            impressions: prev.impressions + m.impressions,
            reach: prev.reach !== undefined && m.reach !== undefined ? prev.reach + m.reach : undefined,
            clicks: prev.clicks + m.clicks,
            purchases: prev.purchases + m.purchases,
            revenue: prev.revenue + m.revenue,
          }
        : m,
    );
  });

  if (!rows.size) throw new CsvError("No campaign rows found in this file.");
  return { rows, warnings };
}

/** Match campaigns across the two periods by name. */
export function pairPeriods(
  previous: ParsedPeriod,
  current: ParsedPeriod,
): { campaigns: CampaignInput[]; warnings: string[] } {
  const warnings = [...new Set([...previous.warnings, ...current.warnings])];
  const campaigns: CampaignInput[] = [];
  const unmatched: string[] = [];
  for (const [name, curr] of current.rows) {
    const prev = previous.rows.get(name);
    if (!prev) {
      unmatched.push(name);
      continue;
    }
    if (prev.spend <= 0 || curr.spend <= 0 || prev.impressions <= 0 || curr.impressions <= 0) {
      warnings.push(`"${name}" had no spend in one period and was left out.`);
      continue;
    }
    campaigns.push({ name, previous: prev, current: curr });
  }
  if (unmatched.length) {
    warnings.push(
      `${unmatched.length} campaign${unmatched.length > 1 ? "s" : ""} only ran in the current period and ${
        unmatched.length > 1 ? "were" : "was"
      } left out: ${unmatched.slice(0, 3).join(", ")}${unmatched.length > 3 ? "…" : ""}`,
    );
  }
  if (!campaigns.length) {
    throw new CsvError(
      "No campaign appears in both files. Export the same campaigns for both date ranges, with names unchanged.",
    );
  }
  return { campaigns, warnings };
}
