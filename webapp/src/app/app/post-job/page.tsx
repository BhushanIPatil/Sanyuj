"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import {
  fetchCategoryTree,
  flattenCategories,
  type CategoryTreeGroup,
} from "@/lib/categories";
import { CategoryPicker } from "@/components/CategoryPicker";
import { useToast } from "@/components/Toast";

export default function PostJobPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [tree, setTree] = useState<CategoryTreeGroup[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("400");
  const [budgetMax, setBudgetMax] = useState("600");
  const [urgency, setUrgency] = useState<"today" | "this_week" | "flexible">("today");
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: prof }, groups] = await Promise.all([
        visible(supabase.from("profiles").select("pincode")).eq("id", user.id).single(),
        fetchCategoryTree(supabase),
      ]);
      setPincode(prof?.pincode ?? "");
      setTree(groups);
      const first = groups[0]?.categories[0];
      if (first) setCategoryId(first.id);
    };
    void load();
  }, []);

  async function submit() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      if (!pincode) throw new Error("Set your pincode in profile first");
      if (!description.trim()) throw new Error("Describe what you need");
      if (!categoryId) throw new Error("Select a category");

      const catName =
        flattenCategories(tree).find((c) => c.id === categoryId)?.name ?? "Service";
      const title =
        description.trim().split(/[.!\n]/)[0].slice(0, 80) || `${catName} request`;

      const { error } = await supabase.from("jobs").insert({
        customer_id: user.id,
        category_id: categoryId,
        title,
        description: description.trim(),
        budget_min: Number(budgetMin) || null,
        budget_max: Number(budgetMax) || null,
        urgency,
        pincode,
        is_active: true,
        is_deleted: false,
      });
      if (error) throw error;
      showToast("Job posted — nearby providers notified");
      router.push("/app/my-jobs");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not post job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-pad max-w-2xl">
      <header className="mb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </button>
        <div>
          <p className="eyebrow">New request</p>
          <h1 className="font-display text-lg font-bold">Post a Job</h1>
        </div>
      </header>

      <label className="mb-2 block text-xs font-bold">Category</label>
      <CategoryPicker tree={tree} value={categoryId} onChange={setCategoryId} />

      <label className="mb-2 mt-5 block text-xs font-bold">What do you need done?</label>
      <textarea
        className="input-box min-h-[110px] resize-none"
        placeholder="Kitchen tap leaking since yesterday…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label className="mb-2 mt-5 block text-xs font-bold">Expected amount</label>
      <div className="flex gap-2">
        <div className="flex flex-1 items-center rounded-[18px] border-[1.5px] border-line bg-white px-3.5">
          <span className="mr-1 font-mono font-bold text-green-deep">₹</span>
          <input
            className="w-full py-3 font-mono text-[15px] font-bold outline-none"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value.replace(/\D/g, ""))}
            placeholder="Min"
          />
        </div>
        <div className="flex flex-1 items-center rounded-[18px] border-[1.5px] border-line bg-white px-3.5">
          <span className="mr-1 font-mono font-bold text-green-deep">₹</span>
          <input
            className="w-full py-3 font-mono text-[15px] font-bold outline-none"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value.replace(/\D/g, ""))}
            placeholder="Max"
          />
        </div>
      </div>

      <label className="mb-2 mt-5 block text-xs font-bold">When do you need this?</label>
      <div className="flex gap-2">
        {(
          [
            ["today", "Today"],
            ["this_week", "This week"],
            ["flexible", "Flexible"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setUrgency(id)}
            className={`flex-1 rounded-[18px] border-[1.5px] py-3 text-[12.5px] font-bold ${
              urgency === id
                ? "border-green-deep bg-green-soft text-green-deep"
                : "border-line bg-white text-ink-soft"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mb-2 mt-5 block text-xs font-bold">Location</label>
      <div className="flex items-center gap-2.5 rounded-[18px] bg-cyan-soft px-3.5 py-3 text-xs font-bold text-blue-deep">
        📍 Auto-filled — {pincode || "set pincode in profile"}
      </div>

      <button className="btn-primary mt-6" disabled={loading} onClick={() => void submit()}>
        {loading ? "Posting…" : "Post Job to nearby providers"}
      </button>
    </div>
  );
}
