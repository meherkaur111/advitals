import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How AdVitals handles your data: diagnoses run in your browser and your ad numbers are never stored on a server.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-14">
      <h1 className="display text-5xl">Privacy</h1>
      <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-ink/85">
        <p>
          <strong>Your ad numbers stay in your browser.</strong> The diagnosis is calculated on your device. Numbers you type
          or files you upload are never sent to our servers or stored in a database.
        </p>
        <p>
          <strong>Share links.</strong> When you copy a report link, the numbers are encoded in the part of the URL after the
          #. Browsers don&apos;t send that part to any server. Anyone you give the link to can see the numbers, so only share
          it with people you trust.
        </p>
        <p>
          <strong>Recent checks.</strong> Your last few reports are kept in your browser&apos;s local storage so you can reopen
          them. Clearing your browser data removes them.
        </p>
        <p>
          <strong>Analytics.</strong> We use Microsoft Clarity to understand how people use the site (pages visited, clicks,
          scrolling) so we can improve it. The input form and report areas are masked from Clarity recordings, so your ad numbers are not captured.
        </p>
        <p>
          <strong>No ad-account access.</strong> AdVitals never connects to your Meta account and never asks for a login.
        </p>
      </div>
    </article>
  );
}
