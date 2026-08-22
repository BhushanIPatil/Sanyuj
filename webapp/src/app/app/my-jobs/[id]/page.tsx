"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import { categoryDisplayName } from "@/lib/categories";
import { useToast } from "@/components/Toast";
import { finalizeJobDeal, reopenJob } from "@/lib/jobs/deal";
import {
  JOB_STATUSES,
  jobStatusLabel,
  type JobStatus,
} from "@/lib/jobs/status";

type CatRef = { id: string; name: string; slug: string } | null;

type Interest = {
  id: string;
  offered_amount: number | null;
  status: string;
  businesses: {
    id: string;
    name: string;
    rating: number;
    categories: CatRef;
  } | null;
};

type Job = {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  urgency: string;
  budget_min: number | null;
  budget_max: number | null;
  pincode: string;
  categories: CatRef;
};

const NONE_PROVIDER = "__none__";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [savingStatus, setSavingStatus] = useState(false);
  const [showClosePicker, setShowClosePicker] = useState(false);
  const [closeProvider, setCloseProvider] = useState(NONE_PROVIDER);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: j } = await visible(
      supabase.from("jobs").select(
        "id, title, description, status, urgency, budget_min, budget_max, pincode, categories(id, name, slug)",
      ),
    )
      .eq("id", id)
      .single();
    setJob(j as unknown as Job | null);
    const { data: ints } = await visible(
      supabase
        .from("job_interests")
        .select("id, offered_amount, status, businesses(id, name, rating, categories(id, name, slug))"),
    )
      .eq("job_id", id)
      .neq("status", "withdrawn");
    setInterests((ints as unknown as Interest[]) ?? []);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function updateStatus(next: JobStatus) {
    if (!job || savingStatus) return;

    if (next === "closed") {
      const selected = interests.find((i) => i.status === "selected");
      setCloseProvider(selected?.id ?? NONE_PROVIDER);
      setShowClosePicker(true);
      return;
    }

    if (next === job.status) return;

    setSavingStatus(true);
    setShowClosePicker(false);
    try {
      const supabase = createClient();
      await reopenJob(supabase, id);
      await load();
      showToast("Job reopened");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setSavingStatus(false);
    }
  }

  async function confirmCloseWithProvider() {
    if (!job || savingStatus) return;
    setSavingStatus(true);
    try {
      const supabase = createClient();
      const interestId = closeProvider === NONE_PROVIDER ? null : closeProvider;
      await finalizeJobDeal(supabase, id, interestId);
      setShowClosePicker(false);
      await load();
      showToast(
        interestId
          ? "Deal closed with selected provider"
          : "Job closed without a provider",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not close job");
    } finally {
      setSavingStatus(false);
    }
  }

  async function dealFinal(interestId: string) {
    if (!job || job.status !== "open" || finalizingId) return;
    setFinalizingId(interestId);
    try {
      const supabase = createClient();
      await finalizeJobDeal(supabase, id, interestId);
      await load();
      showToast("Deal finalized — job closed");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not finalize deal");
    } finally {
      setFinalizingId(null);
    }
  }

  if (!job) return <div className="p-8 text-ink-soft">Loading…</div>;

  const selectedInterest = interests.find((i) => i.status === "selected");

  return (
    <div className="page-pad">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/app/my-jobs"
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div>
          <p className="eyebrow">Job · {jobStatusLabel(job.status)}</p>
          <h1 className="font-display text-[17px] font-bold">{job.title.slice(0, 40)}</h1>
        </div>
      </header>

      <div className="rounded-[26px] border border-line bg-white p-4.5 shadow-card">
        <p className="eyebrow">
          {categoryDisplayName(job.categories)} · {job.pincode}
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
            [String(interests.length), "Interested"],
          ].map(([v, l]) => (
            <div key={l} className="flex-1 rounded-[12px] bg-surface p-2.5 text-center">
              <div className="font-mono text-[13.5px] font-bold capitalize">{v}</div>
              <div className="mt-0.5 text-[9.5px] uppercase tracking-wide text-ink-soft">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-[18px] border border-line bg-white p-4 shadow-card">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-bold">Status</h2>
          <p className="text-[11px] text-ink-soft">You can change this anytime</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {JOB_STATUSES.map((status) => {
            const active = job.status === status && !showClosePicker;
            return (
              <button
                key={status}
                type="button"
                disabled={savingStatus || !!finalizingId}
                onClick={() => void updateStatus(status)}
                className={`rounded-[14px] border px-2 py-2.5 text-center text-[11px] font-bold leading-snug transition disabled:opacity-60 ${
                  active || (status === "closed" && showClosePicker)
                    ? status === "open"
                      ? "border-green-deep bg-green-soft text-green-deep"
                      : "border-ink bg-ink text-white"
                    : "border-line bg-surface text-ink-soft hover:border-ink-soft"
                }`}
              >
                {jobStatusLabel(status)}
              </button>
            );
          })}
        </div>

        {showClosePicker ? (
          <div className="mt-3 rounded-[14px] border border-dashed border-line bg-surface p-3">
            <p className="text-xs font-bold text-ink">Closed with which provider?</p>
            <p className="mt-1 text-[11px] text-ink-soft">
              Pick who you finalized the deal with, or none if you closed without one.
            </p>
            <select
              className="mt-2.5 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-blue-deep"
              value={closeProvider}
              disabled={savingStatus}
              onChange={(e) => setCloseProvider(e.target.value)}
            >
              <option value={NONE_PROVIDER}>None — closed without a provider</option>
              {interests.map((i) => {
                const name = i.businesses?.name ?? "Provider";
                return (
                  <option key={i.id} value={i.id}>
                    {name}
                    {i.offered_amount != null ? ` · ₹${i.offered_amount}` : ""}
                  </option>
                );
              })}
            </select>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={savingStatus}
                onClick={() => setShowClosePicker(false)}
                className="flex-1 rounded-[12px] border border-line bg-white py-2.5 text-xs font-bold text-ink-soft"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingStatus}
                onClick={() => void confirmCloseWithProvider()}
                className="flex-1 rounded-[12px] bg-ink py-2.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {savingStatus ? "Saving…" : "Confirm close"}
              </button>
            </div>
          </div>
        ) : null}

        {job.status === "closed" && !showClosePicker ? (
          <p className="mt-3 text-[11px] text-ink-soft">
            {selectedInterest?.businesses
              ? `Deal closed with ${selectedInterest.businesses.name}.`
              : "Closed without selecting a provider."}
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <h2 className="font-display text-base font-bold">Interested providers</h2>
        <div className="mt-3 space-y-3">
          {interests.map((i) => {
            const b = i.businesses;
            if (!b) return null;
            const isSelected = i.status === "selected";
            const isClosedOut = i.status === "closed";
            return (
              <div
                key={i.id}
                className={`relative rounded-[18px] border bg-white p-3.5 shadow-card ${
                  isSelected ? "border-green-deep" : "border-line"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isSelected ? (
                    <span className="absolute -top-2 right-3 rounded-full bg-green-deep px-2 py-1 font-mono text-[9px] font-bold text-white">
                      DEAL FINAL
                    </span>
                  ) : (
                    <span className="absolute -top-2 right-3 rounded-full bg-ink px-2 py-1 font-mono text-[9px] font-bold text-white">
                      NEAR YOU
                    </span>
                  )}
                  <div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-blue-soft font-display font-bold text-blue-deep">
                    {b.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{b.name}</p>
                    <p className="text-[11.5px] text-ink-soft">
                      {i.offered_amount != null ? (
                        <>
                          Offered <b className="text-ink">₹{i.offered_amount}</b> ·{" "}
                        </>
                      ) : null}
                      {b.rating.toFixed(1)} ★
                      {isClosedOut ? " · Not selected" : null}
                    </p>
                  </div>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-[13px] grad-hero text-white"
                    onClick={() => showToast(`Calling ${b.name}…`)}
                  >
                    ☎
                  </button>
                </div>
                {job.status === "open" && i.status === "waiting" ? (
                  <button
                    type="button"
                    disabled={!!finalizingId || savingStatus}
                    onClick={() => void dealFinal(i.id)}
                    className="mt-3 w-full rounded-[14px] border-[1.5px] border-green-deep bg-green-soft py-2.5 text-xs font-bold text-green-deep disabled:opacity-60"
                  >
                    {finalizingId === i.id ? "Closing deal…" : "Deal final"}
                  </button>
                ) : null}
              </div>
            );
          })}
          {!interests.length ? (
            <p className="text-sm text-ink-soft">No interest yet — providers nearby will see your post.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
