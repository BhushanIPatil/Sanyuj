"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import { CategoryPickerSkeleton } from "@/components/ui/Skeleton";
import { isCategoryImageUrl, type Category, type CategoryTreeGroup } from "@/lib/categories";

type Props = {
  tree: CategoryTreeGroup[];
  value: string | null;
  onChange: (categoryId: string) => void;
  /** When true, show only subcategories (flat). Default: group then subs. */
  flat?: boolean;
  /** When true, show skeleton instead of empty-state copy. */
  loading?: boolean;
};

export function CategoryPicker({ tree, value, onChange, flat = false, loading = false }: Props) {
  if (loading) {
    return <CategoryPickerSkeleton flat={flat} />;
  }

  if (!tree.length) {
    return <p className="text-sm text-ink-soft">No categories yet. Add them in Supabase.</p>;
  }

  if (flat) {
    const all = tree.flatMap((g) => g.categories);
    return (
      <div className="flex flex-wrap gap-2">
        {all.map((c) => (
          <CategoryChip key={c.id} category={c} selected={value === c.id} onSelect={onChange} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tree.map((group) => (
        <div key={group.id}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
            {group.name}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.categories.map((c) => (
              <CategoryChip
                key={c.id}
                category={c}
                selected={value === c.id}
                onSelect={onChange}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryChip({
  category,
  selected,
  onSelect,
}: {
  category: Category;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2 text-xs font-bold ${
        selected
          ? "border-blue-deep bg-blue-soft text-blue-deep"
          : "border-line bg-white text-ink-soft"
      }`}
    >
      {category.emoji ? (
        isCategoryImageUrl(category.emoji) ? (
          <CategoryIcon value={category.emoji} alt="" fallback="" size="chip" />
        ) : (
          <span>{category.emoji}</span>
        )
      ) : null}
      {category.name}
    </button>
  );
}
