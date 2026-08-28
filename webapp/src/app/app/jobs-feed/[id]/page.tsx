"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import { categoryDisplayName } from "@/lib/categories";
import { useToast } from "@/components/Toast";
import { JobDetailSkeleton } from "@/components/ui/Skeleton";
import { locationLabel } from "@/lib/geo/display";

type Job = {
  id: string;
  title: string;
  description: string;
  urgency: string;
  budget_min: number | null;
  budget_max: number | null;
  pincode: string;
  locality: string | null;
  categories: { id: string; name: string; slug: string } | null;
};

export default function ProviderJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [others, setOthers] = useState(0);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: biz } = await visible(supabase.from("businesses").select("id"))
        .eq("owner_id", user.id)
        .maybeSingle();
      setBusinessId(biz?.id ?? null);

      const { data: j } = await visible(
        supabase.from("jobs").select(
          "id, title, description, urgency, budget_min, budget_max, pincode, locality, categories(id, name, slug)",
        ),
      )
        .eq("id", id)
        .single();
      setJob(j as unknown as Job | null);

      const { count } = await visible(
        supabase.from("job_interests").select("*", { count: "exact", head: true }),
      )
        .eq("job_id", id)
        .neq("status", "withdrawn");
      setOthers(count ?? 0);

      if (biz) {
        const { data: mine } = await visible(supabase.from("job_interests").select("id"))
          .eq("job_id", id)
          .eq("business_id", biz.id)
          .neq("status", "withdrawn")
          .maybeSingle();
        setSent(!!mine);
      }
    };
    void load();
  }, [id]);

  async function sendInterest() {
    if (!businessId) {
      showToast("Create a business profile first");
      router.push("/app/business/setup");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("job_interests").upsert(
      { job_id: id, business_id: businessId, status: "waiting", is_active: true, is_deleted: false },
      { onConflict: "job_id,business_id" },
    );
    if (error) {
      showToast(error.message);
      return;
    }
    setSent(true);
    showToast("Interest sent — the customer can now call you");
  }

  if (!job) return <JobDetailSkeleton />;

  return (
    <div className="page-pad">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/app/jobs-feed"
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div>
          <p className="eyebrow">
            Job request · {locationLabel({ locality: job.locality, pincode: job.pincode })}
          </p>
          <h1 className="font-display text-[17px] font-bold">{job.title.slice(0, 36)}</h1>
        </div>
      </header>

      <div className="rounded-[26px] border border-line bg-white p-4.5 shadow-card">
        <p className="eyebrow">
          {categoryDisplayName(job.categories)} ·{" "}
          {locationLabel({ locality: job.locality, pincode: job.pincode })}
        </p>
        <h2 className="mt-1.5 font-display text-[16.5px] font-bold leading-snug">{job.title}</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{job.description}</p>
        <div className="mt-3.5 flex gap-2.5">
          {[
            [
              job.budget_min != null
                ? `₹${job.budget_min}${job.budget_max ? `-${job.budget_max}` : ""}`
                : "—",
              "Budget",
            ],
            [job.urgency.replace("_", " "), "Timeline"],
            [locationLabel({ locality: job.locality, pincode: job.pincode }), "Area"],
          ].map(([v, l]) => (
            <div key={l} className="flex-1 rounded-[12px] bg-surface p-2.5 text-center">
              <div className="font-mono text-[13.5px] font-bold capitalize">{v}</div>
              <div className="mt-0.5 text-[9.5px] uppercase tracking-wide text-ink-soft">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-soft">
        {others} provider{others === 1 ? "" : "s"} interested in this job
      </p>

      <div className="mt-4">
        <button
          className="btn-primary"
          style={sent ? { background: "var(--green-deep)", boxShadow: "none" } : undefined}
          disabled={sent}
          onClick={() => void sendInterest()}
        >
          {sent ? "Interest Sent ✓" : "Send Interest — Customer will call you"}
        </button>
        <p className="mt-3 text-center text-xs leading-relaxed text-ink-faint">
          Your phone number is shared only after the customer chooses to call you.
        </p>
      </div>
    </div>
  );
}
