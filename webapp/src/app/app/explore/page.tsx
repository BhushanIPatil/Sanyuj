"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  categoryDisplayName,
  fetchCategoryTree,
  flattenCategories,
  type Category,
  type CategoryTreeGroup,
} from "@/lib/categories";
import { useToast } from "@/components/Toast";

type Biz = {
  id: string;
  name: string;
  rating: number;
  categories: { id: string; name: string; slug: string; emoji: string | null } | null;
};

function ExploreInner() {
  const params = useSearchParams();
  const initialSlug = params.get("category") ?? "";
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [categorySlug, setCategorySlug] = useState(initialSlug);
  const [tree, setTree] = useState<CategoryTreeGroup[]>([]);
  const [sort, setSort] = useState<"nearest" | "rated">("rated");
  const [items, setItems] = useState<Biz[]>([]);
  const [pincode, setPincode] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [profRes, groups] = await Promise.all([
        supabase.from("profiles").select("pincode").eq("id", user.id).single(),
        fetchCategoryTree(supabase),
      ]);
      setPincode(profRes.data?.pincode ?? null);
      setTree(groups);

      const allCats = flattenCategories(groups);
      const selected = allCats.find((c) => c.slug === categorySlug);

      let query = supabase
        .from("businesses")
        .select("id, name, rating, owner_id, categories(id, name, slug, emoji)");
      if (selected) query = query.eq("category_id", selected.id);
      const { data: all } = await query.order("rating", { ascending: false }).limit(40);

      if (!profRes.data?.pincode || !all?.length) {
        setItems((all as unknown as Biz[]) ?? []);
        return;
      }

      const ownerIds = all.map((b) => b.owner_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, pincode")
        .in("id", ownerIds);
      const pinSet = new Set(
        (profiles ?? []).filter((p) => p.pincode === profRes.data?.pincode).map((p) => p.id),
      );
      const filtered = all.filter((b) => pinSet.has(b.owner_id));
      setItems((filtered.length ? filtered : all) as unknown as Biz[]);
    };
    void load();
  }, [categorySlug]);

  const chips: Category[] = flattenCategories(tree);

  const filtered = items.filter((b) => {
    if (!q.trim()) return true;
    const hay = `${b.name} ${categoryDisplayName(b.categories)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) =>
    sort === "rated" ? b.rating - a.rating : a.name.localeCompare(b.name),
  );

  return (
    <div className="page-pad">
      <header className="mb-6">
        <p className="eyebrow">Discover</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">Explore providers</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft sm:text-base">
          Browse trusted local businesses near {pincode ?? "your area"}.
        </p>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2.5 rounded-[16px] border-[1.5px] border-line bg-white px-4 py-3 shadow-card">
          <span className="text-ink-faint">⌕</span>
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Search providers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(
            [
              ["rated", "Top rated"],
              ["nearest", "A–Z"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={`rounded-[14px] border px-4 py-3 text-sm font-bold ${
                sort === id
                  ? "border-blue-deep bg-blue-deep text-white"
                  : "border-line bg-white text-ink-soft"
              }`}
              onClick={() => setSort(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        <button
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${
            !categorySlug
              ? "border-blue-deep bg-blue-deep text-white"
              : "border-line bg-white text-ink-soft"
          }`}
          onClick={() => setCategorySlug("")}
        >
          All
        </button>
        {chips.map((c) => (
          <button
            key={c.id}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${
              categorySlug === c.slug
                ? "border-blue-deep bg-blue-deep text-white"
                : "border-line bg-white text-ink-soft"
            }`}
            onClick={() => setCategorySlug(c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-4 shadow-card"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-blue-soft text-base">
              {b.categories?.emoji ?? "📍"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{b.name}</p>
              <p className="text-xs text-ink-soft">
                {b.rating.toFixed(1)} ★ · {categoryDisplayName(b.categories)}
              </p>
            </div>
            <button
              className="text-sm font-bold text-blue-deep"
              onClick={() => showToast(`Calling ${b.name}…`)}
            >
              Call
            </button>
          </div>
        ))}
      </div>

      {!sorted.length ? (
        <p className="py-10 text-center text-sm text-ink-soft">No providers found.</p>
      ) : null}

      <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-[24px] bg-indigo-soft p-5 sm:flex-row sm:items-center">
        <h3 className="font-display text-base font-bold text-indigo sm:text-lg">
          Not seeing the right fit?
        </h3>
        <Link
          href="/app/post-job"
          className="rounded-full bg-indigo px-5 py-2.5 text-sm font-bold text-white"
        >
          Post a Job
        </Link>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="page-pad text-ink-soft">Loading…</div>}>
      <ExploreInner />
    </Suspense>
  );
}
