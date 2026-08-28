"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import {
  fetchCategoryTree,
  type CategoryTreeGroup,
} from "@/lib/categories";
import { CategoryPicker } from "@/components/CategoryPicker";
import { useToast } from "@/components/Toast";
import { EditProfileSkeleton } from "@/components/ui/Skeleton";
import { LocalityPicker } from "@/components/LocalityPicker";

type Urgency = "today" | "this_week" | "flexible";

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [tree, setTree] = useState<CategoryTreeGroup[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("today");
  const [pincode, setPincode] = useState("");
  const [locality, setLocality] = useState("");
  const [ready, setReady] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/auth/login");
          return;
        }

        const [jobRes, groups] = await Promise.all([
          visible(
            supabase
              .from("jobs")
              .select(
                "id, title, description, status, urgency, budget_min, budget_max, pincode, locality, category_id, customer_id",
              ),
          )
            .eq("id", id)
            .eq("customer_id", user.id)
            .single(),
          fetchCategoryTree(supabase),
        ]);

        setTree(groups);
        setCategoriesLoading(false);

        const job = jobRes.data;
        if (!job) {
          showToast("Job not found");
          router.replace("/app/my-jobs");
          return;
        }
        if (job.status !== "open") {
          showToast("Only open jobs can be edited");
          router.replace(`/app/my-jobs/${id}`);
          return;
        }

        setTitle(job.title ?? "");
        setDescription(job.description ?? "");
        setBudgetMin(job.budget_min != null ? String(job.budget_min) : "");
        setBudgetMax(job.budget_max != null ? String(job.budget_max) : "");
        setUrgency((job.urgency as Urgency) || "flexible");
        setPincode(job.pincode ?? "");
        setLocality(job.locality ?? "");
        setCategoryId(job.category_id ?? null);
        setReady(true);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Could not load job");
        router.replace("/app/my-jobs");
      } finally {
        setCategoriesLoading(false);
      }
    };
    void load();
  }, [id, router, showToast]);

  async function save() {
    setSaving(true);
    try {
      if (!title.trim()) throw new Error("Enter a job title");
      if (!description.trim()) throw new Error("Describe what you need");
      if (!categoryId) throw new Error("Select a category");
      if (pincode.length !== 6) throw new Error("Enter a valid 6-digit pincode");
      if (!locality.trim()) throw new Error("Select a locality");

      const supabase = createClient();
      const { error } = await visible(
        supabase.from("jobs").update({
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId,
          budget_min: Number(budgetMin) || null,
          budget_max: Number(budgetMax) || null,
          urgency,
          pincode,
          locality: locality.trim(),
        }),
      ).eq("id", id);
      if (error) throw error;

      showToast("Job updated");
      router.replace(`/app/my-jobs/${id}`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save job");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <EditProfileSkeleton />;

  return (
    <div className="page-pad max-w-2xl">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href={`/app/my-jobs/${id}`}
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div>
          <p className="eyebrow">Update request</p>
          <h1 className="font-display text-lg font-bold">Edit job</h1>
        </div>
      </header>

      <label className="mb-2 block text-xs font-bold">Category</label>
      <CategoryPicker
        tree={tree}
        value={categoryId}
        onChange={setCategoryId}
        loading={categoriesLoading}
      />

      <label className="mb-2 mt-5 block text-xs font-bold">Title</label>
      <input
        className="input-box"
        placeholder="e.g. Kitchen tap leaking"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
      />

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
        ).map(([uid, label]) => (
          <button
            key={uid}
            type="button"
            onClick={() => setUrgency(uid)}
            className={`flex-1 rounded-[18px] border-[1.5px] py-3 text-[12.5px] font-bold ${
              urgency === uid
                ? "border-green-deep bg-green-soft text-green-deep"
                : "border-line bg-white text-ink-soft"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mb-2 mt-5 block text-xs font-bold">Pincode for this job</label>
      <input
        className="input-box font-mono text-base font-bold tracking-wide"
        inputMode="numeric"
        maxLength={6}
        placeholder="425001"
        value={pincode}
        onChange={(e) => {
          setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
          setLocality("");
        }}
      />

      <label className="mb-2 mt-4 block text-xs font-bold">Locality</label>
      <LocalityPicker pincode={pincode} value={locality} onChange={setLocality} />

      <button
        className="btn-primary mt-6"
        disabled={
          saving ||
          !title.trim() ||
          !description.trim() ||
          !categoryId ||
          pincode.length !== 6 ||
          !locality.trim()
        }
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
