"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, categoryLabel } from "@/lib/auth/phone";
import { useToast } from "@/components/Toast";

type Biz = { id: string; name: string; category: string; rating: number };

function ExploreInner() {
  const params = useSearchParams();
  const initialCat = params.get("category") ?? "";
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(initialCat);
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
      const { data: prof } = await supabase
        .from("profiles")
        .select("pincode")
        .eq("id", user.id)
        .single();
      setPincode(prof?.pincode ?? null);

      let query = supabase.from("businesses").select("id, name, category, rating, owner_id");
      if (category) query = query.eq("category", category);
      const { data: all } = await query.order("rating", { ascending: false }).limit(40);

      if (!prof?.pincode || !all?.length) {
        setItems(all ?? []);
        return;
      }

      const ownerIds = all.map((b) => b.owner_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, pincode")
        .in("id", ownerIds);
      const pinSet = new Set(
        (profiles ?? []).filter((p) => p.pincode === prof.pincode).map((p) => p.id),
      );
      const filtered = all.filter((b) => pinSet.has(b.owner_id));
      setItems(filtered.length ? filtered : all);
    };
    void load();
  }, [category]);

  const filtered = items.filter((b) => {
    if (!q.trim()) return true;
    const hay = `${b.name} ${categoryLabel(b.category)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) =>
    sort === "rated" ? b.rating - a.rating : a.name.localeCompare(b.name),
  );

  return (
    <div>
      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-[#DCEEFB] to-[#E1F9EE]">
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, rgba(46,134,214,0.18) 0 2px, transparent 2px 46px)",
        }} />
        <Link
          href="/app"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <p className="absolute bottom-10 left-0 right-0 text-center font-display text-sm font-bold text-blue-deep">
          Map view · {pincode ?? "your area"}
        </p>
      </div>

      <div className="relative z-10 -mt-6 rounded-t-[28px] bg-white pt-3.5 shadow-card">
        <div className="mx-auto mb-3.5 h-1 w-10 rounded bg-line" />
        <div className="mx-5 mb-3.5 flex items-center gap-2.5 rounded-[18px] border-[1.5px] border-line bg-surface px-3.5 py-3">
          <span className="text-ink-faint">⌕</span>
          <input
            className="flex-1 bg-transparent text-[13.5px] outline-none"
            placeholder="Search providers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto px-5">
          <button
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold ${
              !category ? "border-blue-deep bg-blue-deep text-white" : "border-line bg-surface text-ink-soft"
            }`}
            onClick={() => setCategory("")}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold ${
                category === c.id
                  ? "border-blue-deep bg-blue-deep text-white"
                  : "border-line bg-surface text-ink-soft"
              }`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto px-5">
          {(
            [
              ["rated", "Top rated"],
              ["nearest", "A–Z"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold ${
                sort === id
                  ? "border-blue-deep bg-blue-deep text-white"
                  : "border-line bg-surface text-ink-soft"
              }`}
              onClick={() => setSort(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-5 pb-4">
          {sorted.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 border-b border-line py-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-blue-soft text-sm">
                📍
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold">{b.name}</p>
                <p className="text-[11px] text-ink-soft">
                  {b.rating.toFixed(1)} ★ · {categoryLabel(b.category)}
                </p>
              </div>
              <button
                className="text-xs font-bold text-blue-deep"
                onClick={() => showToast(`Calling ${b.name}…`)}
              >
                Call
              </button>
            </div>
          ))}
          {!sorted.length ? (
            <p className="py-6 text-center text-sm text-ink-soft">No providers found.</p>
          ) : null}
        </div>

        <div className="mx-5 mb-4 flex items-center justify-between gap-3 rounded-[26px] bg-indigo-soft p-4">
          <h3 className="font-display text-[14.5px] font-bold text-indigo">Not seeing the right fit?</h3>
          <Link href="/app/post-job" className="rounded-full bg-indigo px-3.5 py-2.5 text-xs font-bold text-white">
            Post a Job
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="p-8 text-ink-soft">Loading…</div>}>
      <ExploreInner />
    </Suspense>
  );
}
