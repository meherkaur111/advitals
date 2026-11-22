export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "formula"; text: string }
  | { type: "callout"; text: string };

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  readMins: number;
  body: Block[];
}

export const POSTS: Post[] = [
  {
    slug: "why-did-my-meta-ads-roas-drop",
    title: "Why did my Meta ads ROAS drop? A 4-lever way to find out",
    description:
      "ROAS is four numbers multiplied together. Split the drop into CPM, CTR, conversion rate and order value and the cause usually becomes obvious.",
    date: "2026-11-21",
    readMins: 6,
    body: [
      {
        type: "p",
        text: "A falling ROAS is the most common panic in D2C marketing, and the most common reaction is the wrong one: pause ads, refresh creative, cut budget. Sometimes that works. Often it treats the wrong problem, because ROAS isn't one thing. It's four things multiplied together.",
      },
      { type: "h2", text: "ROAS is a product, not a metric" },
      { type: "p", text: "Write out what ROAS actually is and it breaks into a chain:" },
      { type: "formula", text: "ROAS = (1000 ÷ CPM) × CTR × CVR × AOV" },
      {
        type: "p",
        text: "Each link answers a separate question. CPM: what does attention cost right now? CTR: when people see the ad, do they click? CVR: when they land, do they buy? AOV: when they buy, how much? Multiply them and you get revenue per rupee of spend. That's the whole identity, and it's exact. There is no fifth factor hiding somewhere.",
      },
      {
        type: "p",
        text: "Because it's a product, you can split any ROAS change into the share each lever caused. Take logs and the multiplication becomes addition: the log of the ROAS ratio equals the sum of the log ratios of the four levers. Scale each lever's share back to the actual percentage change and the four contributions add up exactly to the total.",
      },
      { type: "h2", text: "A worked example" },
      {
        type: "p",
        text: "Say ROAS went from 3.5× to 2.6× week on week, a 26% drop. Underneath: CPM rose 8%, CTR fell 22%, CVR fell 2% and AOV was flat. Split it and CTR explains roughly three-quarters of the drop. CPM explains most of the rest. Conversion barely moved. That rules out the landing page, the checkout and the offer in one step. The problem is in the ad itself, before anyone clicks.",
      },
      {
        type: "callout",
        text: "The rule of thumb: find the lever that moved most, and you have found which team owns the fix. CPM belongs to media buying and the market. CTR belongs to creative. CVR belongs to the website and offer. AOV belongs to merchandising and pricing.",
      },
      { type: "h2", text: "What each lever usually means" },
      {
        type: "ul",
        items: [
          "CPM up, CTR steady: auction pressure. Festive seasons, sale events and end-of-quarter budgets push costs up for everyone. Your ads aren't worse; attention got pricier.",
          "CTR down, frequency up: creative fatigue. The same people keep seeing the same ad and stop responding.",
          "CTR steady, CVR down: a post-click leak. Something on the site changed, such as stock, price, speed, shipping fees or a broken checkout step.",
          "CVR down by 70% or more overnight with clicks steady: suspect tracking before you suspect customers. A broken pixel or Conversions API setup looks exactly like a sales collapse in Ads Manager.",
          "AOV down: people are buying cheaper items or using a bigger discount. Check which product and code are driving orders now.",
        ],
      },
      { type: "h2", text: "Don't chase noise" },
      {
        type: "p",
        text: "With small numbers, rates swing on their own. A campaign with 60 clicks and 3 purchases can show a 33% conversion drop because one person didn't buy. Before acting on a CTR or CVR change, check whether it's statistically real. A two-proportion z-test is the standard way: it asks whether the gap between two rates is bigger than chance would produce given the sample sizes. As a rough floor, aim for at least 100 link clicks and 10 purchases per period before trusting a conversion swing.",
      },
      { type: "h2", text: "Check campaigns, not just the account" },
      {
        type: "p",
        text: "An account total can look fine while one campaign is on fire, because a strong retargeting campaign can mask a fatigued prospecting one. Run the split per campaign. The fixes are usually different for each.",
      },
      {
        type: "p",
        text: "AdVitals does this split automatically: give it two weeks of numbers and it shows how much each lever moved your ROAS, tests the rate changes for significance and maps the pattern to a likely cause and a short list of fixes.",
      },
    ],
  },
  {
    slug: "meta-ads-creative-fatigue-signs",
    title: "Creative fatigue on Meta ads: how to spot it (and when it's something else)",
    description:
      "Falling CTR plus rising frequency is the fatigue signature. Here's how to confirm it, what it gets confused with and how to fix it without resetting learning.",
    date: "2026-11-21",
    readMins: 5,
    body: [
      {
        type: "p",
        text: "Creative fatigue is the most-blamed and most-misdiagnosed problem in Meta advertising. Teams see ROAS fall, assume the ads are tired, and ship new creative. If the real problem was a CPM spike or a checkout bug, nothing improves and a week is gone.",
      },
      { type: "h2", text: "The fatigue signature" },
      {
        type: "p",
        text: "Fatigue has a specific shape. Two things happen together: click-through rate falls, and frequency (impressions divided by reach) rises. The same people are seeing the same ad more often and responding less each time. If only one of those is happening, it's probably not fatigue.",
      },
      {
        type: "ul",
        items: [
          "CTR down by 15% or more versus the previous period, and the drop is statistically significant, not just noise from a small sample",
          "Frequency above roughly 2.5 for prospecting, or up 20% or more week on week",
          "Reach flat or shrinking while impressions hold, which means you are re-showing ads rather than finding new people",
        ],
      },
      { type: "h2", text: "What it gets confused with" },
      {
        type: "p",
        text: "Rising CPM alone is not fatigue. If CTR holds while CPM climbs, the auction got more expensive, which is common around sales and festive periods. New creative won't lower the market price of attention.",
      },
      {
        type: "p",
        text: "Falling conversion rate alone is not fatigue either. If people still click at the same rate but fewer buy, the problem is after the click: stock-outs, a price change, slower pages or a broken checkout step. And if conversions drop to near zero overnight while clicks hold, check the pixel before anything else.",
      },
      {
        type: "p",
        text: "Falling CTR with low frequency is a message problem rather than fatigue. The ad isn't overexposed; it just isn't landing, often because targeting widened to colder audiences.",
      },
      { type: "h2", text: "How to fix real fatigue" },
      {
        type: "ul",
        items: [
          "Ship new hooks, not new colours. The first three seconds and the opening line do most of the work, so change the angle, not the palette.",
          "Change format. If everything is static, add creator-style video or a carousel. A new format reaches people the old one stopped reaching.",
          "Keep what works. If an offer or angle converted well, keep it and change the execution.",
          "Kill the worst performers inside the ad set instead of rebuilding the whole campaign, which resets learning.",
          "Keep one or two new creatives in testing every week so you have replacements ready before fatigue shows up.",
        ],
      },
      {
        type: "callout",
        text: "Fatigue is predictable. Track CTR and frequency weekly and you will see it coming one to two weeks before ROAS falls.",
      },
      {
        type: "p",
        text: "AdVitals checks for this pattern automatically. It flags fatigue only when the CTR drop passes a significance test and frequency backs it up, and it tells you when the real culprit is cost, conversion or tracking instead.",
      },
    ],
  },
];

export const getPost = (slug: string) => POSTS.find((p) => p.slug === slug);
