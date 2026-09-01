import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "indigo" | "rose" | "teal";
}) {
  const tones = {
    blue: "bg-blue-soft text-blue-deep",
    green: "bg-green-soft text-green-deep",
    amber: "bg-amber-soft text-amber",
    indigo: "bg-indigo-soft text-indigo",
    rose: "bg-rose-soft text-rose",
    teal: "bg-teal-soft text-teal",
  };

  return (
    <div className="rounded-[18px] border border-line bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-ink-soft">{label}</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-ink">{value}</p>
          {hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
        </div>
        <span className={clsx("flex h-10 w-10 items-center justify-center rounded-[14px]", tones[tone])}>
          <Icon size={18} strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
}
