import {
  type CampaignInput,
  type DerivedMetrics,
  type PeriodMetrics,
  derive,
  pctChange,
  sumPeriods,
} from "./metrics";
import { twoProportionTest, type RateTest } from "./stats";

export type Severity = "critical" | "warning" | "info" | "good";
export type Lever = "cpm" | "ctr" | "cvr" | "aov";

export interface Finding {
  id:
    | "tracking"
    | "creative-fatigue"
    | "ctr-decline"
    | "audience-saturation"
    | "auction-pressure"
    | "post-click-leak"
    | "basket-shrink"
    | "low-data"
    | "healthy"
    | "improving"
    | "gradual-slide"
    | "campaign-hotspots";
  severity: Severity;
  title: string;
  summary: string;
  evidence: string[];
  actions: string[];
}

export interface LeverContribution {
  lever: Lever;
  label: string;
  /** Relative change of the lever itself, e.g. +0.2 = CPM up 20%. */
  change: number;
  /** Share of the ROAS change this lever explains, in ROAS percentage points. */
  roasImpactPts: number;
  /** True when this lever pushed ROAS down. */
  hurt: boolean;
}

export interface Decomposition {
  roasChange: number;
  levers: LeverContribution[];
  primary: LeverContribution | null;
}

export type Verdict = "healthy" | "watch" | "act";

export interface Diagnosis {
  name: string;
  previous: DerivedMetrics;
  current: DerivedMetrics;
  changes: Record<keyof Omit<DerivedMetrics, never>, number | null>;
  ctrTest: RateTest | null;
  cvrTest: RateTest | null;
  decomposition: Decomposition | null;
  findings: Finding[];
  verdict: Verdict;
}

export interface Report {
  account: Diagnosis;
  campaigns: Diagnosis[];
  generatedAt: string;
}

// Thresholds. Kept in one place so they are easy to explain and tune.
export const T = {
  ctrDrop: -0.15,
  cvrDrop: -0.15,
  cpmRise: 0.2,
  aovDrop: -0.1,
  freqHigh: 2.5,
  freqVeryHigh: 3.5,
  freqRise: 0.2,
  reachFlat: 0.05,
  trackingCvrDrop: -0.7,
  roasStable: -0.05,
  minPurchases: 10,
  minClicks: 100,
} as const;

const LEVER_LABEL: Record<Lever, string> = {
  cpm: "Cost of attention (CPM)",
  ctr: "Click-through rate (CTR)",
  cvr: "Conversion rate (CVR)",
  aov: "Average order value (AOV)",
};

const pct = (x: number) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;

/**
 * Split the ROAS change across the four levers.
 * ln(ROAS2/ROAS1) = ln(CPM1/CPM2) + ln(CTR2/CTR1) + ln(CVR2/CVR1) + ln(AOV2/AOV1)
 * Each lever's share of the log change is scaled to the actual % change in ROAS,
 * so the four impacts add up exactly to the ROAS change.
 */
export function decompose(prev: DerivedMetrics, curr: DerivedMetrics): Decomposition | null {
  const vals = [prev.cpm, curr.cpm, prev.ctr, curr.ctr, prev.cvr, curr.cvr, prev.aov, curr.aov, prev.roas, curr.roas];
  if (vals.some((v) => v === null || v <= 0)) return null;

  const ratios: Record<Lever, number> = {
    cpm: prev.cpm! / curr.cpm!, // inverted: higher CPM hurts ROAS
    ctr: curr.ctr! / prev.ctr!,
    cvr: curr.cvr! / prev.cvr!,
    aov: curr.aov! / prev.aov!,
  };
  const roasChange = curr.roas! / prev.roas! - 1;
  const totalLog = Math.log(curr.roas! / prev.roas!);

  const levers: LeverContribution[] = (Object.keys(ratios) as Lever[]).map((lever) => {
    const logPart = Math.log(ratios[lever]);
    const share = Math.abs(totalLog) < 1e-9 ? 0 : logPart / totalLog;
    const leverChange =
      lever === "cpm" ? curr.cpm! / prev.cpm! - 1 : ratios[lever] - 1;
    // When ROAS is flat, show raw lever effect instead of a share of ~zero.
    const impact = Math.abs(totalLog) < 1e-9 ? ratios[lever] - 1 : share * roasChange;
    return {
      lever,
      label: LEVER_LABEL[lever],
      change: leverChange,
      roasImpactPts: impact,
      hurt: logPart < 0,
    };
  });

  const hurting = levers.filter((l) => l.hurt).sort((a, b) => a.roasImpactPts - b.roasImpactPts);
  const primary = roasChange < 0 && hurting.length ? hurting[0] : null;
  return { roasChange, levers, primary };
}

export function diagnose(name: string, prevRaw: PeriodMetrics, currRaw: PeriodMetrics): Diagnosis {
  const prev = derive(prevRaw);
  const curr = derive(currRaw);

  const keys = Object.keys(prev) as (keyof DerivedMetrics)[];
  const changes = Object.fromEntries(
    keys.map((k) => [k, pctChange(prev[k] as number | null, curr[k] as number | null)]),
  ) as Diagnosis["changes"];

  const ctrTest = twoProportionTest(prevRaw.clicks, prevRaw.impressions, currRaw.clicks, currRaw.impressions);
  const cvrTest = twoProportionTest(prevRaw.purchases, prevRaw.clicks, currRaw.purchases, currRaw.clicks);
  const decomposition = decompose(prev, curr);

  const findings: Finding[] = [];
  const dCtr = changes.ctr;
  const dCvr = changes.cvr;
  const dCpm = changes.cpm;
  const dAov = changes.aov;
  const dFreq = changes.frequency;
  const dReach = changes.reach;
  const dRoas = changes.roas;

  const ctrFell = dCtr !== null && dCtr <= T.ctrDrop && (ctrTest?.significant ?? false);
  const ctrStable = dCtr === null || dCtr > T.ctrDrop || !(ctrTest?.significant ?? false);
  const cvrFell = dCvr !== null && dCvr <= T.cvrDrop && (cvrTest?.significant ?? false);

  const lowData =
    Math.min(prevRaw.purchases, currRaw.purchases) < T.minPurchases ||
    Math.min(prevRaw.clicks, currRaw.clicks) < T.minClicks;

  // 1. Tracking break: clicks keep coming, purchases collapse. Check this first,
  // because every other conclusion is meaningless if the pixel stopped firing.
  const trackingBreak =
    prevRaw.purchases >= T.minPurchases &&
    ((dCvr !== null && dCvr <= T.trackingCvrDrop) || (currRaw.purchases === 0 && currRaw.clicks >= T.minClicks)) &&
    ctrStable;
  if (trackingBreak) {
    findings.push({
      id: "tracking",
      severity: "critical",
      title: "Possible tracking break",
      summary:
        "Clicks held up but recorded purchases collapsed. That pattern is more often a broken pixel or Conversions API than a sudden loss of buyers.",
      evidence: [
        `Conversion rate ${dCvr !== null ? pct(dCvr) : "fell to zero"}`,
        `Click-through rate ${dCtr !== null ? pct(dCtr) : "n/a"} (not the problem)`,
      ],
      actions: [
        "Compare Meta purchases with orders in Shopify or your backend for the same days",
        "Open Events Manager and check the Purchase event for drops, errors or a falling Event Match Quality score",
        "Check for recent site changes: a new theme, checkout app or consent banner often breaks the pixel",
        "Don't cut budgets until you know whether real sales actually fell",
      ],
    });
  }

  // 2. Creative fatigue: fewer people click, and the same people keep seeing the ad.
  const freqKnown = curr.frequency !== null && prev.frequency !== null;
  const freqPressure =
    freqKnown && (curr.frequency! >= T.freqHigh || (dFreq !== null && dFreq >= T.freqRise));
  if (!trackingBreak && ctrFell && freqPressure) {
    findings.push({
      id: "creative-fatigue",
      severity: "critical",
      title: "Creative fatigue",
      summary:
        "Your audience has seen these ads too many times. Click-through is falling while frequency rises, which is the classic fatigue signature.",
      evidence: [
        `CTR ${pct(dCtr!)} (statistically significant, z = ${ctrTest!.z.toFixed(1)})`,
        `Frequency ${prev.frequency!.toFixed(2)} → ${curr.frequency!.toFixed(2)}`,
      ],
      actions: [
        "Launch 3–5 new creatives with new hooks, not just recoloured versions of the old ones",
        "Test a different format: if it's all static, add UGC video or a carousel",
        "Keep the winning offer and angle; change the first 3 seconds and the visual",
        "Pause ads whose CTR fell the most rather than cutting the whole ad set",
      ],
    });
  } else if (!trackingBreak && ctrFell) {
    findings.push({
      id: "ctr-decline",
      severity: "warning",
      title: "Ads are losing their pull",
      summary: freqKnown
        ? "Click-through dropped meaningfully, but frequency is still low, so it is not classic fatigue. The message or targeting may no longer match the audience."
        : "Click-through dropped meaningfully. Add reach data to tell whether this is fatigue or a message problem.",
      evidence: [
        `CTR ${pct(dCtr!)} (statistically significant, z = ${ctrTest!.z.toFixed(1)})`,
        freqKnown
          ? `Frequency ${curr.frequency!.toFixed(2)}, below the ${T.freqHigh} fatigue line`
          : "Reach not provided, so frequency is unknown",
      ],
      actions: [
        "Check whether targeting or placements changed (Advantage+ expansion can widen to colder people)",
        "Look at CTR by ad and kill the bottom third",
        "Test a sharper hook that names the customer's problem in the first line",
      ],
    });
  }

  // 3. Audience saturation: frequency very high, reach not growing, cost rising.
  const reachFlat = dReach === null ? false : dReach <= T.reachFlat;
  if (
    !trackingBreak &&
    freqKnown &&
    curr.frequency! >= T.freqVeryHigh &&
    reachFlat &&
    dCpm !== null &&
    dCpm >= 0.1
  ) {
    findings.push({
      id: "audience-saturation",
      severity: "warning",
      title: "Audience saturation",
      summary:
        "You're paying more to reach the same people again. The audience is too small for the budget behind it.",
      evidence: [
        `Frequency ${curr.frequency!.toFixed(2)} (above ${T.freqVeryHigh})`,
        `Reach ${dReach !== null ? pct(dReach) : "n/a"} while CPM ${pct(dCpm)}`,
      ],
      actions: [
        "Broaden targeting: remove interest stacks or test a broad / Advantage+ audience",
        "Add lookalikes from purchasers if you haven't already",
        "If you can't widen the audience, lower the budget to match it",
      ],
    });
  }

  // 4. Auction pressure: cost of attention rose but the ads still perform.
  if (!trackingBreak && dCpm !== null && dCpm >= T.cpmRise && ctrStable) {
    findings.push({
      id: "auction-pressure",
      severity: "warning",
      title: "Auction pressure (costs, not creative)",
      summary:
        "You're paying noticeably more per 1,000 impressions, but people engage as before. This usually comes from the market (sale seasons, more advertisers), not from your ads.",
      evidence: [`CPM ${pct(dCpm)}`, `CTR ${dCtr !== null ? pct(dCtr) : "n/a"} (holding)`],
      actions: [
        "Check the calendar: festive sales, Black Friday and end-of-quarter push CPMs up for everyone",
        "Open up placements (Advantage+ placements) so Meta can find cheaper inventory",
        "Don't refresh creative just for this, since creative is not what broke",
        "If margins allow, hold spend through the spike; if not, shift budget to retargeting where conversion is higher",
      ],
    });
  }

  // 5. Post-click leak: people still click, fewer buy.
  if (!trackingBreak && cvrFell && ctrStable) {
    findings.push({
      id: "post-click-leak",
      severity: "critical",
      title: "Post-click leak",
      summary:
        "The ads still earn clicks, but fewer clickers buy. The problem is after the click: landing page, price, stock or checkout.",
      evidence: [
        `Conversion rate ${pct(dCvr!)} (statistically significant, z = ${cvrTest!.z.toFixed(1)})`,
        `CTR ${dCtr !== null ? pct(dCtr) : "n/a"} (holding)`,
      ],
      actions: [
        "Check whether best-sellers went out of stock or sizes ran out",
        "Look for price increases, a removed discount or higher shipping fees",
        "Test the landing page on a mid-range phone on mobile data; anything over 3 seconds loses buyers",
        "Make sure the ad's promise matches the landing page (same offer, same product)",
      ],
    });
  } else if (!trackingBreak && cvrFell) {
    findings.push({
      id: "post-click-leak",
      severity: "warning",
      title: "Fewer clickers are buying",
      summary:
        "Conversion rate fell alongside click-through. Weaker traffic quality often lowers both, so fix the top of the funnel first and recheck.",
      evidence: [`Conversion rate ${pct(dCvr!)}`, `CTR ${pct(dCtr!)}`],
      actions: [
        "Refresh creative first, then recheck conversion rate after a week",
        "Check whether the audience shifted to colder people",
      ],
    });
  }

  // 6. Basket shrink.
  if (!trackingBreak && dAov !== null && dAov <= T.aovDrop && currRaw.purchases >= 5) {
    findings.push({
      id: "basket-shrink",
      severity: "warning",
      title: "Smaller baskets",
      summary: "People are buying, but each order is worth less, so the same conversions bring in less revenue.",
      evidence: [`Average order value ${pct(dAov)}`],
      actions: [
        "Check whether a cheaper product or a discount code is now driving most orders",
        "Add a bundle or a free-shipping threshold just above your current order value",
        "Point ads at higher-value products or kits",
      ],
    });
  }

  // 7. Low data caveat.
  if (lowData) {
    findings.push({
      id: "low-data",
      severity: "info",
      title: "Small numbers, so read with care",
      summary:
        "There are too few clicks or purchases for every swing to be real. Changes we flag as significant passed a statistical test; the rest may be noise.",
      evidence: [
        `Purchases: ${prevRaw.purchases} → ${currRaw.purchases} (aim for 10+ per period)`,
        `Clicks: ${prevRaw.clicks} → ${currRaw.clicks} (aim for 100+ per period)`,
      ],
      actions: ["Compare longer windows (14 or 28 days) to get steadier numbers"],
    });
  }

  // 8. No single lever broke, but ROAS still slid: several small leaks add up.
  const problems = findings.filter((f) => f.severity === "critical" || f.severity === "warning");
  if (!problems.length && dRoas !== null && dRoas <= -0.1) {
    const hurting = (decomposition?.levers ?? [])
      .filter((l) => l.hurt)
      .sort((a, b) => a.roasImpactPts - b.roasImpactPts);
    findings.push({
      id: "gradual-slide",
      severity: "warning",
      title: "Several small leaks",
      summary:
        "No single lever crossed an alarm threshold, but small moves in several of them compound. Fix the biggest contributor first.",
      evidence: [
        `ROAS ${pct(dRoas)}`,
        ...hurting.slice(0, 3).map((l) => `${l.lever.toUpperCase()} ${pct(l.change)} → ${pct(l.roasImpactPts)} of ROAS`),
      ],
      actions: [
        hurting[0]?.lever === "cpm"
          ? "Costs are the biggest drag: check seasonality and open up placements before touching creative"
          : hurting[0]?.lever === "ctr"
            ? "Click-through is the biggest drag: start testing fresh hooks before it becomes full fatigue"
            : hurting[0]?.lever === "cvr"
              ? "Conversion is the biggest drag: review landing page speed, stock and pricing"
              : "Order value is the biggest drag: review discounts and product mix",
        "Check campaigns one by one: an account total often hides one campaign doing most of the damage",
      ],
    });
  } else if (!problems.length) {
    if (dRoas !== null && dRoas > 0.05) {
      findings.push({
        id: "improving",
        severity: "good",
        title: "Improving",
        summary: "ROAS is up and no lever shows a warning sign. Something is working, so find out what before you change anything.",
        evidence: [`ROAS ${pct(dRoas)}`],
        actions: [
          "Raise budget in steps of about 20% every 3–4 days so the ad set doesn't re-enter learning",
          "Note which ads gained the most and brief new creative in the same direction",
        ],
      });
    } else {
      findings.push({
        id: "healthy",
        severity: "good",
        title: "Stable",
        summary: "No lever moved enough to worry about. Keep testing new creative in the background so you're ready before fatigue hits.",
        evidence: dRoas !== null ? [`ROAS ${pct(dRoas)}`] : [],
        actions: ["Keep 1–2 new creatives in testing every week", "Re-run this check weekly"],
      });
    }
  }

  const verdict: Verdict = findings.some((f) => f.severity === "critical")
    ? "act"
    : findings.some((f) => f.severity === "warning") || (dRoas !== null && dRoas <= T.roasStable * 3)
      ? "watch"
      : "healthy";

  const order: Record<Severity, number> = { critical: 0, warning: 1, good: 2, info: 3 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return { name, previous: prev, current: curr, changes, ctrTest, cvrTest, decomposition, findings, verdict };
}

export function buildReport(campaigns: CampaignInput[], now = new Date()): Report {
  if (!campaigns.length) throw new Error("Add at least one campaign");
  const account = diagnose(
    campaigns.length === 1 ? campaigns[0].name || "Account" : "All campaigns",
    sumPeriods(campaigns.map((c) => c.previous)),
    sumPeriods(campaigns.map((c) => c.current)),
  );
  const perCampaign =
    campaigns.length > 1 ? campaigns.map((c) => diagnose(c.name, c.previous, c.current)) : [];
  // A healthy total can hide a broken campaign, so the headline takes the worst verdict.
  const rank: Record<Verdict, number> = { healthy: 0, watch: 1, act: 2 };
  const worst = [account, ...perCampaign].reduce<Verdict>(
    (w, d) => (rank[d.verdict] > rank[w] ? d.verdict : w),
    "healthy",
  );

  let findings = account.findings;
  const sick = perCampaign.filter((c) => c.verdict !== "healthy");
  if (sick.length) {
    // Point the reader at the campaigns doing the damage, and don't call the account "stable" when it isn't.
    sick.sort((a, b) => rank[b.verdict] - rank[a.verdict]);
    findings = [
      {
        id: "campaign-hotspots",
        severity: sick.some((c) => c.verdict === "act") ? "critical" : "warning",
        title: `${sick.length} of ${perCampaign.length} campaigns need attention`,
        summary:
          "The account total blends healthy and unhealthy campaigns, so it can understate what is going wrong. Start with these:",
        evidence: sick.map((c) => `${c.name}: ${c.findings[0]?.title ?? "check"}`),
        actions: ["Open each campaign under 'By campaign' for its specific fixes"],
      },
      ...findings.filter((f) => f.id !== "healthy" && f.id !== "improving"),
    ];
  }
  return {
    account: { ...account, verdict: worst, findings },
    campaigns: perCampaign,
    generatedAt: now.toISOString(),
  };
}
