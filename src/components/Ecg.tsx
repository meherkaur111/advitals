/** Decorative ECG trace that flattens partway through, like a falling ROAS. */
export function Ecg({ className = "", color = "#fff" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 600 120" className={className} aria-hidden="true" preserveAspectRatio="none">
      <path
        className="ecg-trace"
        d="M0 60 H70 l10 -8 l8 8 H120 l8 -42 l10 80 l8 -38 H200 l10 -10 l10 10 H270 l8 -36 l10 70 l8 -34 H350 l10 -6 l8 6 H400 l6 -18 l9 34 l7 -16 H470 l8 -4 l8 4 H520 l5 -8 l6 14 l5 -6 H600"
        fill="none"
        stroke={color}
        strokeOpacity="0.9"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
