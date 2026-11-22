/**
 * Core metric types and derivations.
 *
 * Everything in the diagnosis rests on one identity:
 *
 *   ROAS = revenue / spend
 *        = (impressions / spend) × (clicks / impressions) × (purchases / clicks) × (revenue / purchases)
 *        = (1000 / CPM) × CTR × CVR × AOV
 *
 * So any change in ROAS is exactly the product of changes in four levers:
 * what you pay for attention (CPM), whether people click (CTR),
 * whether clickers buy (CVR) and how much they spend (AOV).
 */

export interface PeriodMetrics {
  spend: number;
  impressions: number;
  /** Optional: Meta reach. Needed for frequency. */
  reach?: number;
  /** Link clicks (preferred) or all clicks. */
  clicks: number;
  purchases: number;
  revenue: number;
}

export interface CampaignInput {
  name: string;
  previous: PeriodMetrics;
  current: PeriodMetrics;
}

export interface DerivedMetrics {
  spend: number;
  impressions: number;
  reach: number | null;
  clicks: number;
  purchases: number;
  revenue: number;
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  cvr: number | null;
  cpa: number | null;
  aov: number | null;
  roas: number | null;
  frequency: number | null;
}

const safeDiv = (a: number, b: number): number | null =>
  Number.isFinite(a) && Number.isFinite(b) && b > 0 ? a / b : null;

export function derive(m: PeriodMetrics): DerivedMetrics {
  const reach = m.reach && m.reach > 0 ? m.reach : null;
  const cpmRaw = safeDiv(m.spend, m.impressions);
  return {
    spend: m.spend,
    impressions: m.impressions,
    reach,
    clicks: m.clicks,
    purchases: m.purchases,
    revenue: m.revenue,
    cpm: cpmRaw === null ? null : cpmRaw * 1000,
    ctr: safeDiv(m.clicks, m.impressions),
    cpc: safeDiv(m.spend, m.clicks),
    cvr: safeDiv(m.purchases, m.clicks),
    cpa: safeDiv(m.spend, m.purchases),
    aov: safeDiv(m.revenue, m.purchases),
    roas: safeDiv(m.revenue, m.spend),
    frequency: reach ? safeDiv(m.impressions, reach) : null,
  };
}

/** Sum several campaigns into one account-level period. Reach is summed, which
 * over-counts people who saw several campaigns, so account frequency is a lower bound. */
export function sumPeriods(periods: PeriodMetrics[]): PeriodMetrics {
  const hasReach = periods.length > 0 && periods.every((p) => (p.reach ?? 0) > 0);
  return periods.reduce<PeriodMetrics>(
    (acc, p) => ({
      spend: acc.spend + p.spend,
      impressions: acc.impressions + p.impressions,
      reach: hasReach ? (acc.reach ?? 0) + (p.reach ?? 0) : undefined,
      clicks: acc.clicks + p.clicks,
      purchases: acc.purchases + p.purchases,
      revenue: acc.revenue + p.revenue,
    }),
    { spend: 0, impressions: 0, reach: hasReach ? 0 : undefined, clicks: 0, purchases: 0, revenue: 0 },
  );
}

/** Relative change, e.g. 0.25 for +25%. Null when the base is missing or zero. */
export function pctChange(prev: number | null, curr: number | null): number | null {
  if (prev === null || curr === null || prev === 0) return null;
  return curr / prev - 1;
}

export type ValidationIssue = { field: string; message: string };

const FIELDS: (keyof PeriodMetrics)[] = ["spend", "impressions", "reach", "clicks", "purchases", "revenue"];

/** Validate one period. Returns human-readable issues; empty array means valid. */
export function validatePeriod(m: PeriodMetrics, label: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const f of FIELDS) {
    const v = m[f];
    if (v === undefined && f === "reach") continue;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      issues.push({ field: f, message: `${label}: ${f} must be a number` });
    } else if (v < 0) {
      issues.push({ field: f, message: `${label}: ${f} can't be negative` });
    }
  }
  if (issues.length) return issues;
  if (m.spend <= 0) issues.push({ field: "spend", message: `${label}: spend must be above 0` });
  if (m.impressions <= 0) issues.push({ field: "impressions", message: `${label}: impressions must be above 0` });
  if (m.clicks > m.impressions)
    issues.push({ field: "clicks", message: `${label}: clicks can't exceed impressions` });
  if (m.reach !== undefined && m.reach > 0 && m.reach > m.impressions)
    issues.push({ field: "reach", message: `${label}: reach can't exceed impressions` });
  if (m.purchases > m.clicks && m.clicks > 0)
    issues.push({
      field: "purchases",
      message: `${label}: purchases exceed clicks. Use link clicks and purchases from the same attribution setting`,
    });
  if (m.purchases === 0 && m.revenue > 0)
    issues.push({ field: "revenue", message: `${label}: revenue is above 0 but purchases are 0` });
  return issues;
}

export function validateCampaign(c: CampaignInput): ValidationIssue[] {
  return [...validatePeriod(c.previous, "Previous period"), ...validatePeriod(c.current, "Current period")];
}
