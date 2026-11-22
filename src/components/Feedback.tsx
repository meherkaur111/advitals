"use client";

import { useState } from "react";
import { track } from "@/lib/track";

/** One-tap feedback. Sent as a Clarity custom event, so it needs no backend and stores no ad data. */
export function Feedback() {
  const [sent, setSent] = useState<null | "yes" | "no">(null);
  const vote = (v: "yes" | "no") => {
    setSent(v);
    track(v === "yes" ? "feedback_useful" : "feedback_not_useful");
  };
  return (
    <div className="no-print mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/80 bg-card px-6 py-5">
      {sent ? (
        <p className="font-medium" role="status">
          {sent === "yes" ? "Thanks! Glad it helped." : "Thanks for telling us. We'll keep sharpening the diagnosis."}
        </p>
      ) : (
        <>
          <p className="font-medium">Was this diagnosis useful?</p>
          <div className="flex gap-2">
            <button onClick={() => vote("yes")} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-black">
              Yes, it helped
            </button>
            <button onClick={() => vote("no")} className="rounded-full border border-ink/15 bg-white px-5 py-2 text-sm font-medium hover:border-ink/40">
              Not really
            </button>
          </div>
        </>
      )}
    </div>
  );
}
