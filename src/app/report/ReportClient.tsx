"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildReport, type Report } from "@/lib/diagnose";
import { decodePayload, ShareError, type SharePayload } from "@/lib/share";
import { saveHistory } from "@/lib/history";
import { ReportView } from "@/components/ReportView";
import { track } from "@/lib/track";
import { Feedback } from "@/components/Feedback";
import { Kicker } from "@/components/Kicker";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: SharePayload; report: Report; hash: string };

function load(): State {
  const hash = window.location.hash.replace(/^#/, "");
  try {
    const payload = decodePayload(hash);
    const report = buildReport(payload.campaigns);
    return { status: "ready", payload, report, hash };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof ShareError ? e.message : "Something went wrong while building this report.",
    };
  }
}

export function ReportClient() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const run = () => {
      const s = load();
      setState(s);
      if (s.status === "ready") {
        saveHistory({
          hash: s.hash,
          label: s.payload.label || (s.payload.campaigns.length === 1 ? s.payload.campaigns[0].name : "Account check"),
          verdict: s.report.account.verdict,
          campaigns: s.payload.campaigns.length,
          createdAt: new Date().toISOString(),
        });
        track(`report_${s.report.account.verdict}`);
      }
    };
    run();
    // The report lives in the URL hash, which browsers treat as a scroll target. Always open at the verdict.
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      track("report_link_copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
  };

  if (state.status === "loading") {
    return (
      <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading report">
        <div className="h-48 rounded-3xl bg-line/50" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 rounded-2xl bg-line/50" />
          <div className="h-72 rounded-2xl bg-line/50" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-white/80 bg-card p-8 text-center">
        <Kicker>Report unavailable</Kicker>
        <h1 className="mt-3 display text-3xl">We couldn&apos;t open this report</h1>
        <p className="mt-3 text-muted">{state.message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/check" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white">
            Run a new check
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>Step 2 of 2 · Diagnosis</Kicker>
          <h1 className="mt-2 display text-4xl sm:text-5xl">Your ad vitals</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/check#${state.hash}`} className="rounded-full border border-white/80 bg-card px-4 py-2 hover:border-ink">
            Edit numbers
          </Link>
          <button onClick={() => window.print()} className="rounded-full border border-white/80 bg-card px-4 py-2 hover:border-ink">
            Save as PDF
          </button>
          <button onClick={copyLink} className="rounded-full bg-ink px-4 py-2 font-medium text-white" aria-live="polite">
            {copied ? "Link copied ✓" : "Copy share link"}
          </button>
        </div>
      </div>
      <ReportView report={state.report} currency={state.payload.currency} label={state.payload.label} />
      <Feedback />
      <p className="mt-10 text-xs text-muted">
        Rule-based diagnosis using thresholds and a two-proportion significance test on CTR and CVR. It points to the
        likeliest cause; confirm in Ads Manager before making big budget changes.
      </p>
    </>
  );
}
