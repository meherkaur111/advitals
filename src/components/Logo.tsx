export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <defs>
          <linearGradient id="av-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0593C6" />
            <stop offset="1" stopColor="#D83995" />
          </linearGradient>
        </defs>
        <rect x="0.5" y="0.5" width="25" height="25" rx="8" fill="url(#av-g)" />
        <path
          d="M4 14h4l2-5 3 10 2.5-7 1.5 2H22"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`text-[16px] font-semibold tracking-[-0.02em] ${light ? "text-white" : "text-ink"}`}>
        AdVitals
      </span>
    </span>
  );
}
