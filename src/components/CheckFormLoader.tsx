"use client";

import dynamic from "next/dynamic";

/** The form reads the URL hash and local storage on first render, so it only renders in the browser. */
export const CheckFormLoader = dynamic(() => import("./CheckForm").then((m) => m.CheckForm), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Loading form">
      <div className="h-10 w-72 rounded-full bg-line/60" />
      <div className="h-16 rounded-xl bg-line/50" />
      <div className="h-96 rounded-2xl bg-line/50" />
    </div>
  ),
});
