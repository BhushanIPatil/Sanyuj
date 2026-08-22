"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchCategoryTree, type CategoryTreeGroup } from "@/lib/categories";
import { CategoryPicker } from "@/components/CategoryPicker";
import { useToast } from "@/components/Toast";

export default function BusinessSetupPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tree, setTree] = useState<CategoryTreeGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const groups = await fetchCategoryTree(supabase);
        setTree(groups);
        const first = groups[0]?.categories[0];
        if (first) setCategoryId(first.id);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Could not load categories");
      }
    };
    void load();
  }, [showToast]);

  async function create() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      if (!name.trim()) throw new Error("Enter a business name");
      if (!categoryId) throw new Error("Select a category");

      const { error } = await supabase.from("businesses").insert({
        owner_id: user.id,
        name: name.trim(),
        category_id: categoryId,
        is_active: true,
        is_deleted: false,
      });
      if (error) throw error;
      showToast("Business profile created — nearby customers can now see you");
      router.push("/app/profile");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create business");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-pad max-w-2xl">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/app/profile"
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div>
          <p className="eyebrow">List your business</p>
          <h1 className="font-display text-lg font-bold">Set up your business</h1>
        </div>
      </header>

      <p className="mb-4 text-[12.5px] leading-relaxed text-ink-soft">
        Your pincode &amp; address are already saved on your account — just the essentials below.
      </p>

      <div className="flex flex-col items-center">
        <div className="relative flex h-22 w-22 items-center justify-center rounded-[28px] border-2 border-dashed border-blue-deep bg-blue-soft text-blue-deep">
          <span className="text-2xl">📷</span>
          <span className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-[11px] border-[3px] border-white grad-hero text-white text-lg">
            +
          </span>
        </div>
        <p className="mt-2.5 text-xs font-bold text-ink-soft">Add business photo (optional later)</p>
      </div>

      <label className="mb-2 mt-5 block text-xs font-bold">Business name</label>
      <input
        className="input-box"
        placeholder="e.g. Patil Plumbing Works"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="mb-2 mt-5 block text-xs font-bold">What do you provide?</label>
      <CategoryPicker tree={tree} value={categoryId} onChange={setCategoryId} />

      <button className="btn-primary mt-6" disabled={loading} onClick={() => void create()}>
        {loading ? "Creating…" : "Create Business Profile"}
      </button>
    </div>
  );
}
