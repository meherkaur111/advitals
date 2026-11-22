/** Single place for brand + deployment config. Change the domain via NEXT_PUBLIC_SITE_URL. */
export const SITE = {
  name: "AdVitals",
  tagline: "A 60-second health check for your Meta ads",
  description:
    "Find out why your Meta (Facebook & Instagram) ads ROAS dropped. AdVitals splits the change into cost, clicks, conversion and basket size, then tells you what to fix: creative fatigue, auction pressure, a post-click leak or a tracking break.",
  // Explicit domain wins; on Vercel, fall back to the project's production domain (your custom domain once added).
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000"
  ).replace(/\/$/, ""),
  author: "Meher Saluja",
  authorUrl: "https://www.linkedin.com/in/mehersaluja",
};
