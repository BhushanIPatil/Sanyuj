"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { categoryLabel } from "@/lib/auth/phone";
import { useToast } from "@/components/Toast";

type Job = {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  budget_min: number | null;
  budget_max: number | null;
  pincode: string;
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
      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      setBusinessId(biz?.id ?? null);

      const { data: j } = await supabase.from("jobs").select("*").eq("id", id).single();
      setJob(j);

      const { count } = await supabase
        .from("job_interests")
        .select("*", { count: "exact", head: true })
        .eq("job_id", id)
        .neq("status", "withdrawn");
      setOthers(count ?? 0);

      if (biz) {
        const { data: mine } = await supabase
          .from("job_interests")
          .select("id")
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
      { job_id: id, business_id: businessId, status: "waiting" },
      { onConflict: "job_id,business_id" },
    );
    if (error) {
      showToast(error.message);
      return;
    }
    setSent(true);
    showToast("Interest sent — the customer can now call you");
  }

  if (!job) return <div className="p-8 text-ink-soft">Loading…</div>;

  return (
    <div>
      <header className="flex items-center gap-3 px-5 pb-3 pt-5">
        <Link
          href="/app/jobs-feed"
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div>
          <p className="eyebrow">Job request · {job.pincode}</p>
          <h1 className="font-display text-[17px] font-bold">{job.title.slice(0, 36)}</h1>
        </div>
      </header>

      <div className="mx-5 rounded-[26px] border border-line bg-white p-4.5 shadow-card">
        <p className="eyebrow">
          {categoryLabel(job.category)} · {job.pincode}
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
            [job.pincode, "Area"],
          ].map(([v, l]) => (
            <div key={l} className="flex-1 rounded-[12px] bg-surface p-2.5 text-center">
              <div className="font-mono text-[13.5px] font-bold capitalize">{v}</div>
              <div className="mt-0.5 text-[9.5px] uppercase tracking-wide text-ink-soft">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="mx-5 mt-4 text-xs text-ink-soft">
        {others} provider{others === 1 ? "" : "s"} interested in this job
      </p>

      <div className="mx-5 mt-4">
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
