import { type CampaignInput, type PeriodMetrics, validateCampaign } from "./metrics";

/**
 * Reports are shared by putting the *inputs* in the URL fragment (#...).
 * The fragment is never sent to a server, so ad data stays in the browser.
 */

export interface SharePayload {
  v: 1;
  currency: string;
  label?: string;
  campaigns: CampaignInput[];
}

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "VND"] as const;

// Compact positional encoding keeps links short: [spend, impressions, reach, clicks, purchases, revenue]
type Packed = [number, number, number, number, number, number];
const pack = (m: PeriodMetrics): Packed => [m.spend, m.impressions, m.reach ?? 0, m.clicks, m.purchases, m.revenue];
const unpack = (p: unknown): PeriodMetrics => {
  if (!Array.isArray(p) || p.length !== 6 || p.some((x) => typeof x !== "number" || !Number.isFinite(x))) {
    throw new Error("bad period");
  }
  return { spend: p[0], impressions: p[1], reach: p[2] > 0 ? p[2] : undefined, clicks: p[3], purchases: p[4], revenue: p[5] };
};

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodePayload(p: SharePayload): string {
  const compact = {
    v: 1,
    c: p.currency,
    l: p.label?.slice(0, 80) || undefined,
    d: p.campaigns.map((c) => [c.name.slice(0, 120), pack(c.previous), pack(c.current)]),
  };
  return toBase64Url(JSON.stringify(compact));
}

export class ShareError extends Error {}

export function decodePayload(hash: string): SharePayload {
  const raw = hash.replace(/^#/, "").trim();
  if (!raw) throw new ShareError("There's no report data in this link.");
  let obj: unknown;
  try {
    obj = JSON.parse(fromBase64Url(raw));
  } catch {
    throw new ShareError("This report link is damaged. It may have been cut off when it was copied.");
  }
  const o = obj as { v?: unknown; c?: unknown; l?: unknown; d?: unknown };
  if (o.v !== 1 || !Array.isArray(o.d) || o.d.length === 0 || o.d.length > 200) {
    throw new ShareError("This report link isn't in a format we recognise.");
  }
  const currency = typeof o.c === "string" && (CURRENCIES as readonly string[]).includes(o.c) ? o.c : "INR";
  let campaigns: CampaignInput[];
  try {
    campaigns = o.d.map((row) => {
      if (!Array.isArray(row) || row.length !== 3 || typeof row[0] !== "string") throw new Error("bad row");
      return { name: row[0], previous: unpack(row[1]), current: unpack(row[2]) };
    });
  } catch {
    throw new ShareError("This report link is damaged. It may have been cut off when it was copied.");
  }
  const invalid = campaigns.flatMap(validateCampaign);
  if (invalid.length) throw new ShareError(`This report has invalid numbers: ${invalid[0].message}.`);
  return { v: 1, currency, label: typeof o.l === "string" ? o.l : undefined, campaigns };
}
