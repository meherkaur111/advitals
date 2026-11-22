import type { CampaignInput } from "./metrics";

/** A realistic D2C skincare account, last 7 days vs the 7 before. */
export const SAMPLE_CAMPAIGNS: CampaignInput[] = [
  {
    name: "Prospecting – Vitamin C serum",
    previous: { spend: 84000, impressions: 420000, reach: 190000, clicks: 5460, purchases: 164, revenue: 295200 },
    current: { spend: 86500, impressions: 405000, reach: 128000, clicks: 3890, purchases: 117, revenue: 210600 },
  },
  {
    name: "Retargeting – cart abandoners",
    previous: { spend: 22000, impressions: 61000, reach: 14500, clicks: 1450, purchases: 96, revenue: 182400 },
    current: { spend: 23500, impressions: 63500, reach: 15200, clicks: 1510, purchases: 68, revenue: 129200 },
  },
  {
    name: "Advantage+ shopping",
    previous: { spend: 60000, impressions: 380000, reach: 240000, clicks: 4180, purchases: 142, revenue: 269800 },
    current: { spend: 74000, impressions: 352000, reach: 226000, clicks: 3940, purchases: 133, revenue: 252700 },
  },
];

export const SAMPLE_LABEL = "Sample: skincare brand, last 7 days vs previous 7";
