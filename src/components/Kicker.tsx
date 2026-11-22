/** Section label pill with a dot, as used on the portfolio ("• Why Wispr Flow"). */
export function Kicker({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-medium ${
        tone === "dark" ? "glass-dark text-white" : "bg-white/80 text-ink shadow-[0_4px_14px_rgb(10_30_60/0.06)]"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-rose" aria-hidden="true" />
      {children}
    </span>
  );
}
