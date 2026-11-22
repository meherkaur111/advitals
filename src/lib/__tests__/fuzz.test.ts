import { describe, expect, it } from "vitest";
import { buildReport } from "../diagnose";
import { validateCampaign, type CampaignInput, type PeriodMetrics } from "../metrics";
import { decodePayload, encodePayload } from "../share";

// Deterministic PRNG so failures are reproducible.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function randomPeriod(r: () => number): PeriodMetrics {
  const scale = [1, 10, 1e3, 1e5, 1e8][Math.floor(r() * 5)];
  const impressions = Math.max(1, Math.floor(r() * scale * 100));
  const reach = r() < 0.2 ? undefined : Math.max(1, Math.floor(impressions * (0.05 + r() * 0.95)));
  const clicks = Math.floor(impressions * r() * (r() < 0.1 ? 1 : 0.05));
  const purchases = r() < 0.15 ? 0 : Math.floor(clicks * r() * 0.2);
  const revenue = purchases === 0 ? 0 : purchases * (1 + r() * 5000);
  return { spend: 0.01 + r() * scale * 10, impressions, reach, clicks, purchases, revenue };
}

const finite = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v));

describe("fuzz: engine never crashes or emits NaN", () => {
  it("5,000 random valid accounts", () => {
    const r = rng(42);
    let checked = 0;
    for (let i = 0; i < 5000; i++) {
      const n = 1 + Math.floor(r() * 4);
      const campaigns: CampaignInput[] = Array.from({ length: n }, (_, k) => ({
        name: `C${k}`,
        previous: randomPeriod(r),
        current: randomPeriod(r),
      }));
      if (campaigns.some((c) => validateCampaign(c).length)) continue;
      checked++;
      const rep = buildReport(campaigns);
      for (const d of [rep.account, ...rep.campaigns]) {
        expect(d.findings.length).toBeGreaterThan(0);
        expect(["healthy", "watch", "act"]).toContain(d.verdict);
        for (const v of Object.values(d.previous)) expect(finite(v)).toBe(true);
        for (const v of Object.values(d.current)) expect(finite(v)).toBe(true);
        for (const v of Object.values(d.changes)) expect(finite(v)).toBe(true);
        for (const f of d.findings) {
          const text = [f.title, f.summary, ...f.evidence, ...f.actions].join(" ");
          expect(text).not.toMatch(/NaN|undefined|Infinity|null/);
        }
        if (d.decomposition) {
          const sum = d.decomposition.levers.reduce((s, l) => s + l.roasImpactPts, 0);
          if (Math.abs(d.decomposition.roasChange) > 1e-9) expect(sum).toBeCloseTo(d.decomposition.roasChange, 6);
        }
        // A falling account is never called stable.
        if (d.changes.roas !== null && d.changes.roas <= -0.1) {
          expect(d.findings.some((f) => f.id === "healthy" || f.id === "improving")).toBe(false);
        }
      }
      // Share links round-trip exactly.
      const back = decodePayload(encodePayload({ v: 1, currency: "INR", campaigns }));
      expect(back.campaigns).toEqual(campaigns);
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it("random garbage share links fail with a clean error, never a crash", () => {
    const r = rng(7);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    for (let i = 0; i < 2000; i++) {
      const len = Math.floor(r() * 300);
      let s = "";
      for (let j = 0; j < len; j++) s += chars[Math.floor(r() * chars.length)];
      try {
        decodePayload(s);
      } catch (e) {
        expect((e as Error).name).toBe("Error");
        expect((e as Error).message.length).toBeGreaterThan(10);
      }
    }
  });

  it("rejects tampered links with impossible numbers", () => {
    const bad = btoa(JSON.stringify({ v: 1, c: "INR", d: [["x", [100, 10, 0, 50, 0, 0], [-5, 10, 0, 5, 0, 0]]] }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(() => decodePayload(bad)).toThrow(/invalid numbers/);
  });
});
