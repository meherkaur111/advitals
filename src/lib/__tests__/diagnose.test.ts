import { describe, expect, it } from "vitest";
import { buildReport, decompose, diagnose } from "../diagnose";
import { derive, validatePeriod, type PeriodMetrics } from "../metrics";
import { twoProportionTest } from "../stats";

const base: PeriodMetrics = {
  spend: 100000,
  impressions: 500000,
  reach: 250000,
  clicks: 6000,
  purchases: 180,
  revenue: 360000,
};

const ids = (prev: PeriodMetrics, curr: PeriodMetrics) =>
  diagnose("t", prev, curr).findings.map((f) => f.id);

describe("derive", () => {
  it("computes the core ratios", () => {
    const d = derive(base);
    expect(d.cpm).toBeCloseTo(200);
    expect(d.ctr).toBeCloseTo(0.012);
    expect(d.cvr).toBeCloseTo(0.03);
    expect(d.aov).toBeCloseTo(2000);
    expect(d.roas).toBeCloseTo(3.6);
    expect(d.frequency).toBeCloseTo(2);
  });

  it("returns null instead of dividing by zero", () => {
    const d = derive({ ...base, purchases: 0, revenue: 0 });
    expect(d.cpa).toBeNull();
    expect(d.aov).toBeNull();
  });
});

describe("decompose", () => {
  it("lever impacts add up to the ROAS change", () => {
    const prev = derive(base);
    const curr = derive({ ...base, spend: 120000, clicks: 5000, purchases: 140, revenue: 266000 });
    const dec = decompose(prev, curr)!;
    const sum = dec.levers.reduce((s, l) => s + l.roasImpactPts, 0);
    expect(sum).toBeCloseTo(dec.roasChange, 6);
  });

  it("identity: ROAS = 1000/CPM × CTR × CVR × AOV", () => {
    const d = derive(base);
    expect((1000 / d.cpm!) * d.ctr! * d.cvr! * d.aov!).toBeCloseTo(d.roas!);
  });

  it("returns null when purchases are zero", () => {
    expect(decompose(derive(base), derive({ ...base, purchases: 0, revenue: 0 }))).toBeNull();
  });
});

describe("diagnose", () => {
  it("flags creative fatigue when CTR falls and frequency climbs", () => {
    const curr = { ...base, reach: 150000, clicks: 4200, purchases: 126, revenue: 252000 };
    const r = ids(base, curr);
    expect(r[0]).toBe("creative-fatigue");
  });

  it("flags auction pressure when CPM rises but CTR holds", () => {
    const curr = { ...base, spend: 130000 };
    const r = ids(base, curr);
    expect(r).toContain("auction-pressure");
    expect(r).not.toContain("creative-fatigue");
  });

  it("flags a post-click leak when CVR falls and CTR holds", () => {
    const curr = { ...base, purchases: 120, revenue: 240000 };
    expect(ids(base, curr)).toContain("post-click-leak");
  });

  it("flags a tracking break when purchases collapse but clicks hold", () => {
    const curr = { ...base, purchases: 20, revenue: 40000 };
    const r = ids(base, curr);
    expect(r[0]).toBe("tracking");
    expect(r).not.toContain("post-click-leak");
  });

  it("flags smaller baskets", () => {
    const curr = { ...base, revenue: 290000 };
    expect(ids(base, curr)).toContain("basket-shrink");
  });

  it("calls a steady account stable", () => {
    const d = diagnose("t", base, { ...base, spend: 101000 });
    expect(d.verdict).toBe("healthy");
    expect(d.findings[0].id).toBe("healthy");
  });

  it("does not call noise a drop on tiny numbers", () => {
    const small = { spend: 1000, impressions: 5000, reach: 3000, clicks: 50, purchases: 3, revenue: 6000 };
    const r = ids(small, { ...small, clicks: 40, purchases: 2, revenue: 4000 });
    expect(r).not.toContain("creative-fatigue");
    expect(r).toContain("low-data");
  });

  it("works without reach", () => {
    const noReach = { ...base, reach: undefined };
    const r = ids(noReach, { ...noReach, clicks: 4200, purchases: 126, revenue: 252000 });
    expect(r).toContain("ctr-decline");
  });
});

describe("buildReport", () => {
  it("adds up campaigns into an account view", () => {
    const rep = buildReport([
      { name: "A", previous: base, current: base },
      { name: "B", previous: base, current: { ...base, spend: 130000 } },
    ]);
    expect(rep.account.current.spend).toBe(230000);
    expect(rep.campaigns).toHaveLength(2);
  });

  it("rejects an empty list", () => {
    expect(() => buildReport([])).toThrow();
  });
});

describe("validatePeriod", () => {
  it("catches impossible inputs", () => {
    expect(validatePeriod({ ...base, clicks: 600000 }, "x").length).toBeGreaterThan(0);
    expect(validatePeriod({ ...base, spend: -1 }, "x").length).toBeGreaterThan(0);
    expect(validatePeriod({ ...base, purchases: 0, revenue: 10 }, "x").length).toBeGreaterThan(0);
    expect(validatePeriod(base, "x")).toEqual([]);
  });
});

describe("twoProportionTest", () => {
  it("is significant for a big change on big samples", () => {
    expect(twoProportionTest(6000, 500000, 4200, 500000)!.significant).toBe(true);
  });
  it("is not significant on small samples", () => {
    expect(twoProportionTest(50, 5000, 40, 5000)!.significant).toBe(false);
  });
});

describe("account roll-up honesty", () => {
  it("never calls a falling account stable", () => {
    const d = diagnose("t", base, { ...base, spend: 112000, clicks: 5400, purchases: 155, revenue: 300000 });
    expect(d.findings.map((f) => f.id)).not.toContain("healthy");
    expect(d.verdict).not.toBe("healthy");
  });

  it("points to the campaigns doing the damage", () => {
    const rep = buildReport([
      { name: "Good", previous: base, current: base },
      { name: "Bad", previous: base, current: { ...base, purchases: 120, revenue: 240000 } },
    ]);
    expect(rep.account.findings[0].id).toBe("campaign-hotspots");
    expect(rep.account.findings[0].evidence.join(" ")).toMatch(/Bad/);
  });
});
