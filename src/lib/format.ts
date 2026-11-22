const fmtCache = new Map<string, Intl.NumberFormat>();
function nf(key: string, opts: Intl.NumberFormatOptions, locale = "en-IN") {
  const k = locale + key;
  if (!fmtCache.has(k)) fmtCache.set(k, new Intl.NumberFormat(locale, opts));
  return fmtCache.get(k)!;
}

const localeFor = (currency: string) => (currency === "INR" ? "en-IN" : "en-US");

export function money(v: number | null, currency: string, decimals = 0): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return nf(`m${currency}${decimals}`, {
    style: "currency",
    currency,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }, localeFor(currency)).format(v);
}

export function num(v: number | null, decimals = 0, currency = "INR"): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return nf(`n${decimals}`, { maximumFractionDigits: decimals, minimumFractionDigits: decimals }, localeFor(currency)).format(v);
}

export function rate(v: number | null, decimals = 2): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
}

export function change(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  const s = (v * 100).toFixed(1);
  return `${v > 0 ? "+" : ""}${s}%`;
}

export function roas(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(2)}×`;
}
