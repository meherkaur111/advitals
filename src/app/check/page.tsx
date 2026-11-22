import type { Metadata } from "next";
import { CheckFormLoader } from "@/components/CheckFormLoader";
import { Kicker } from "@/components/Kicker";

export const metadata: Metadata = {
  title: "Run a Meta ads health check",
  description:
    "Enter two weeks of Meta Ads Manager numbers or upload two CSV exports. Get a diagnosis of why ROAS moved and what to fix, in under a minute.",
  alternates: { canonical: "/check" },
};

export default function CheckPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <Kicker>Step 1 of 2</Kicker>
      <h1 className="mt-2 display text-4xl sm:text-5xl">Give us two weeks of numbers</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Compare the last 7 days with the 7 before. Add one row for the whole account, or one per campaign for a
        sharper diagnosis. Nothing is uploaded: the check runs in your browser.
      </p>
      <div className="mt-8">
        <CheckFormLoader />
      </div>
    </div>
  );
}
