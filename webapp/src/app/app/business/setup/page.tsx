"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, type ServiceCategory } from "@/lib/auth/phone";
import { useToast } from "@/components/Toast";

export default function BusinessSetupPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ServiceCategory>("plumber");
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      if (!name.trim()) throw new Error("Enter a business name");

      const { error } = await supabase.from("businesses").insert({
        owner_id: user.id,
        name: name.trim(),
        category,
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
    <div>
      <header className="flex items-center gap-3 px-5 pb-3 pt-5">
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

      <div className="px-5 pb-6">
        <p className="mb-4 text-[12.5px] leading-relaxed text-ink-soft">
          Your pincode &amp; landmark are already saved on your account — just the essentials below.
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

        <label className="mb-2 mt-5 block text-xs font-bold">What service do you provide?</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-full border-[1.5px] px-3.5 py-2 text-xs font-bold ${
                category === c.id
                  ? "border-blue-deep bg-blue-soft text-blue-deep"
                  : "border-line bg-white text-ink-soft"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <button className="btn-primary mt-6" disabled={loading} onClick={() => void create()}>
          {loading ? "Creating…" : "Create Business Profile"}
        </button>
      </div>
    </div>
  );
}
