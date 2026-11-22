import { ImageResponse } from "next/og";

export const alt = "AdVitals: find out why your Meta ads ROAS dropped";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f5f3ee",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#151514", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 26 26">
              <path d="M4 14h4l2-5 3 10 2.5-7 1.5 2H22" fill="none" stroke="#e5484d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 40, fontWeight: 700, color: "#151514" }}>AdVitals</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 76, lineHeight: 1.05, color: "#151514", fontWeight: 700, letterSpacing: -2 }}>
            Your ROAS dropped.
          </span>
          <span style={{ fontSize: 76, lineHeight: 1.05, color: "#e5484d", fontWeight: 700, letterSpacing: -2 }}>
            Find out why in 60 seconds.
          </span>
        </div>
        <span style={{ fontSize: 30, color: "#66645e" }}>
          Creative fatigue · Auction pressure · Post-click leaks · Tracking breaks
        </span>
      </div>
    ),
    size,
  );
}
