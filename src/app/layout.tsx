import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { SITE } from "@/lib/site";
import { Analytics } from "@/components/Analytics";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} | Why did my Meta ads ROAS drop?`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.author, url: SITE.authorUrl }],
  keywords: [
    "meta ads roas drop",
    "facebook ads creative fatigue",
    "why did my roas drop",
    "meta ads diagnosis",
    "d2c performance marketing",
    "facebook ads cpm increase",
  ],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
  },
  twitter: { card: "summary_large_image", title: `${SITE.name}: ${SITE.tagline}`, description: SITE.description },
  alternates: { canonical: "/" },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = { themeColor: "#eaf5fa" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 pt-20">{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
