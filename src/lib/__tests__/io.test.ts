import { describe, expect, it } from "vitest";
import { CsvError, pairPeriods, parseMetaCsv } from "../csv";
import { decodePayload, encodePayload, ShareError } from "../share";
import { SAMPLE_CAMPAIGNS } from "../sample";
import { buildReport } from "../diagnose";

const META_PREV = `﻿Reporting starts,Reporting ends,Campaign name,Amount spent (INR),Impressions,Reach,Link clicks,Purchases,Purchases conversion value
2026-11-08,2026-11-14,Serum prospecting,"84,000.50",420000,190000,5460,164,295200
2026-11-08,2026-11-14,Retargeting,22000,61000,14500,1450,96,182400
2026-11-08,2026-11-14,Old campaign,1000,9000,5000,40,1,1800
,,,107000.50,490000,,6950,261,479400`;

const META_CURR = `Campaign name,Amount spent (INR),Impressions,Reach,Link clicks,Purchases,Purchases conversion value
Serum prospecting,86500,405000,128000,3890,117,210600
Retargeting,23500,63500,15200,1510,68,129200
New launch,5000,30000,20000,300,6,10800`;

describe("parseMetaCsv", () => {
  it("reads a Meta export with currency headers, commas and a BOM", () => {
    const p = parseMetaCsv(META_PREV);
    expect(p.rows.size).toBe(3);
    expect(p.rows.get("Serum prospecting")!.spend).toBeCloseTo(84000.5);
  });

  it("explains which columns are missing", () => {
    expect(() => parseMetaCsv("Campaign name,Impressions\nA,100")).toThrow(/Amount spent/);
  });

  it("rejects non-CSV input", () => {
    expect(() => parseMetaCsv("hello")).toThrow(CsvError);
  });

  it("pairs campaigns and reports the ones only in one period", () => {
    const { campaigns, warnings } = pairPeriods(parseMetaCsv(META_PREV), parseMetaCsv(META_CURR));
    expect(campaigns.map((c) => c.name)).toEqual(["Serum prospecting", "Retargeting"]);
    expect(warnings.join(" ")).toMatch(/New launch/);
  });
});

describe("share links", () => {
  it("round-trips the sample, including unicode names", () => {
    const hash = encodePayload({ v: 1, currency: "INR", label: "Test ✓", campaigns: SAMPLE_CAMPAIGNS });
    const back = decodePayload("#" + hash);
    expect(back.campaigns).toEqual(SAMPLE_CAMPAIGNS);
    expect(back.label).toBe("Test ✓");
  });

  it("fails clearly on a truncated link", () => {
    const hash = encodePayload({ v: 1, currency: "INR", campaigns: SAMPLE_CAMPAIGNS });
    expect(() => decodePayload(hash.slice(0, 20))).toThrow(ShareError);
    expect(() => decodePayload("")).toThrow(ShareError);
  });
});

describe("sample data", () => {
  it("produces a useful story", () => {
    const rep = buildReport(SAMPLE_CAMPAIGNS);
    const byName = Object.fromEntries(rep.campaigns.map((c) => [c.name, c.findings.map((f) => f.id)]));
    expect(byName["Prospecting – Vitamin C serum"][0]).toBe("creative-fatigue");
    expect(byName["Retargeting – cart abandoners"]).toContain("post-click-leak");
    expect(byName["Advantage+ shopping"]).toContain("auction-pressure");
    expect(rep.account.verdict).toBe("act");
  });
});
