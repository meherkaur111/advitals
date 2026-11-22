import type { Verdict } from "./diagnose";

/** Recent reports kept in this browser only. Storage can be missing or full, so every access is guarded. */
export interface HistoryItem {
  hash: string;
  label: string;
  verdict: Verdict;
  campaigns: number;
  createdAt: string;
}

const KEY = "advitals:history:v1";
const MAX = 8;

export function readHistory(): HistoryItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x) => x && typeof x.hash === "string" && typeof x.label === "string").slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

export function saveHistory(item: HistoryItem): void {
  try {
    const rest = readHistory().filter((h) => h.hash !== item.hash);
    window.localStorage.setItem(KEY, JSON.stringify([item, ...rest].slice(0, MAX)));
  } catch {
    /* private mode or quota: history is a convenience, so fail quietly */
  }
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
