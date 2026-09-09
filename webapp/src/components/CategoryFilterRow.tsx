"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import type { Category } from "@/lib/categories";

/** Written out in full so Tailwind keeps every tint in the build. */
const TINTS = [
  "bg-blue-soft text-blue-deep",
  "bg-green-soft text-green-deep",
  "bg-teal-soft text-teal",
  "bg-indigo-soft text-indigo",
  "bg-cyan-soft text-cyan",
  "bg-rose-soft text-rose",
  "bg-amber-soft text-amber",
];

/** Hashes the slug so a category keeps the same colour between renders. */
export function categoryTint(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 0x7fffffff;
  }
  return TINTS[hash % TINTS.length];
}

/** Mirrors the category group in the filter panel, so both stay in step. */
export function CategoryFilterRow({
  categories,
  selected,
  onToggle,
  onClear,
  className = "",
}: {
  categories: Category[];
  /** Slugs of the active categories. */
  selected: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
  className?: string;
}) {
  if (!categories.length) return null;

  return (
    <div className={`-mx-4 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0 ${className}`}>
      <div className="flex w-max gap-2">
        <Pill
          label="All"
          tint="bg-surface text-ink-soft"
          selected={selected.length === 0}
          onClick={onClear}
        />
        {categories.map((c) => (
          <Pill
            key={c.id}
            label={c.name}
            icon={c.emoji}
            tint={categoryTint(c.slug || c.id)}
            selected={selected.includes(c.slug)}
            onClick={() => onToggle(c.slug)}
          />
        ))}
      </div>
    </div>
  );
}

function Pill({
  label,
  icon,
  tint,
  selected,
  onClick,
}: {
  label: string;
  icon?: string | null;
  tint: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3.5 py-2 text-[12.5px] font-bold transition ${tint} ${
        selected ? "border-current" : "border-transparent"
      }`}
    >
      {icon ? <CategoryIcon value={icon} size="chip" alt="" /> : null}
      {label}
    </button>
  );
}
