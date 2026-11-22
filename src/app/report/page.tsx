import type { Metadata } from "next";
import { ReportClient } from "./ReportClient";

export const metadata: Metadata = {
  title: "Your Meta ads diagnosis",
  // Reports live in the URL fragment and are private to whoever has the link.
  robots: { index: false, follow: false },
};

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <ReportClient />
    </div>
  );
}
