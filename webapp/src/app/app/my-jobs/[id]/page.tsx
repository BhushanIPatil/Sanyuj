"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import { categoryDisplayName } from "@/lib/categories";
import { displayPhone } from "@/lib/auth/phone";
import { useToast } from "@/components/Toast";
import { finalizeJobDeal, reopenJob } from "@/lib/jobs/deal";
import {
  JOB_STATUSES,
  jobStatusLabel,
  type JobStatus,
} from "@/lib/jobs/status";
import { JobDetailSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Users } from "lucide-react";
import {
  SearchableProviderSelect,
  type ProviderCloseOption,
} from "@/components/SearchableProviderSelect";
import { locationLabel } from "@/lib/geo/display";

type CatRef = { id: string; name: string; slug: string } | null;

type Interest = {
  id: string;
  offered_amount: number | null;
  status: string;
  businesses: {
    id: string;
    name: string;
    rating: number;
    owner_id: string;
    categories: CatRef;
    ownerName: string | null;
    ownerPhone: string | null;
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
  locality: string | null;
  area: string | null;
  created_at: string;
  updated_at: string;
  closed_with_business_id: string | null;
  categories: CatRef;
};

const NONE_PROVIDER = "__none__";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function defaultFinalAmount(
  job: { budget_min: number | null; budget_max: number | null },
  offered: number | null | undefined,
) {
  if (offered != null) return String(offered);
  if (job.budget_min != null && job.budget_max != null) {
    return String(Math.round((job.budget_min + job.budget_max) / 2));
  }
  if (job.budget_min != null) return String(job.budget_min);
  if (job.budget_max != null) return String(job.budget_max);
  return "";
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [savingStatus, setSavingStatus] = useState(false);
  const [showClosePicker, setShowClosePicker] = useState(false);
  const [closeProvider, setCloseProvider] = useState(NONE_PROVIDER);
  const [finalAmount, setFinalAmount] = useState("");
  const [finalizingId, setFinalizingId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: j } = await visible(
      supabase.from("jobs").select(
        "id, title, description, status, urgency, budget_min, budget_max, pincode, locality, area, created_at, updated_at, closed_with_business_id, categories(id, name, slug)",
      ),
    )
      .eq("id", id)
      .single();
    setJob(j as unknown as Job | null);

    const { data: ints } = await visible(
      supabase.from("job_interests").select(
        "id, offered_amount, status, businesses(id, name, rating, owner_id, categories(id, name, slug))",
      ),
    )
      .eq("job_id", id)
      .neq("status", "withdrawn");

    const raw = (ints as unknown as Interest[]) ?? [];
    const ownerIds = [
      ...new Set(raw.map((i) => i.businesses?.owner_id).filter((oid): oid is string => !!oid)),
    ];

    const ownerById = new Map<string, { full_name: string | null; phone: string | null }>();
    if (ownerIds.length) {
      const { data: owners } = await visible(
        supabase.from("profiles").select("id, full_name, phone"),
      ).in("id", ownerIds);
      for (const o of owners ?? []) {
        ownerById.set(o.id, { full_name: o.full_name, phone: o.phone });
      }
    }

    setInterests(
      raw.map((i) => {
        if (!i.businesses) return i;
        const owner = ownerById.get(i.businesses.owner_id);
        return {
          ...i,
          businesses: {
            ...i.businesses,
            ownerName: owner?.full_name ?? null,
            ownerPhone: owner?.phone ?? null,
          },
        };
      }),
    );
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function updateStatus(next: JobStatus) {
    if (!job || savingStatus) return;

    if (next === "closed") {
      const jobCategoryId = job.categories?.id ?? null;
      const assignable = interests.filter(
        (i) => !jobCategoryId || i.businesses?.categories?.id === jobCategoryId,
      );
      const winner =
        assignable.find((i) => i.businesses?.id === job.closed_with_business_id) ??
        assignable.find((i) => i.status === "selected");
      const interestId = winner?.id ?? NONE_PROVIDER;
      setCloseProvider(interestId);
      setFinalAmount(
        defaultFinalAmount(
          job,
          interestId === NONE_PROVIDER
            ? null
            : assignable.find((i) => i.id === interestId)?.offered_amount,
        ),
      );
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

    const jobCategoryId = job.categories?.id ?? null;
    const allowed =
      closeProvider !== NONE_PROVIDER &&
      interests.some(
        (i) =>
          i.id === closeProvider &&
          (!jobCategoryId || i.businesses?.categories?.id === jobCategoryId),
      );
    const interestId = allowed ? closeProvider : null;
    const amount = Number(finalAmount);
    if (!finalAmount.trim() || !Number.isFinite(amount) || amount < 0) {
      showToast("Enter a valid final amount");
      return;
    }

    setSavingStatus(true);
    try {
      const supabase = createClient();
      await finalizeJobDeal(supabase, id, interestId, { finalAmount: amount });
      setShowClosePicker(false);
      setFinalizingId(null);
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

  function openDealFinal(interestId: string) {
    if (!job || job.status !== "open" || savingStatus) return;
    const interest = interests.find((i) => i.id === interestId);
    const jobCategoryId = job.categories?.id ?? null;
    if (jobCategoryId && interest?.businesses?.categories?.id !== jobCategoryId) return;
    setCloseProvider(interestId);
    setFinalAmount(defaultFinalAmount(job, interest?.offered_amount));
    setFinalizingId(interestId);
    setShowClosePicker(true);
  }

  if (!job) return <JobDetailSkeleton />;

  const selectedInterest =
    interests.find((i) => i.businesses?.id === job.closed_with_business_id) ??
    interests.find((i) => i.status === "selected");

  const jobCategoryId = job.categories?.id ?? null;
  const dealInterests = interests.filter(
    (i) => !jobCategoryId || i.businesses?.categories?.id === jobCategoryId,
  );

  const closeOptions: ProviderCloseOption[] = dealInterests
    .filter((i) => i.businesses)
    .map((i) => ({
      id: i.id,
      businessName: i.businesses!.name,
      ownerName: i.businesses!.ownerName,
      ownerPhone: i.businesses!.ownerPhone,
      offeredAmount: i.offered_amount,
    }));

  return (
    <div className="page-pad">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/app/my-jobs"
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[17px] font-bold">{job.title.slice(0, 40)}</h1>
          <p className="mt-0.5 text-xs font-semibold text-ink-soft">{jobStatusLabel(job.status)}</p>
        </div>
        {job.status === "open" ? (
          <Link
            href={`/app/my-jobs/${id}/edit`}
            className="shrink-0 rounded-full bg-blue-soft px-3.5 py-2 text-[12px] font-bold text-blue-deep"
          >
            Edit
          </Link>
        ) : null}
      </header>

      <div className="rounded-[26px] border border-line bg-white p-4.5 shadow-card">
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
          {categoryDisplayName(job.categories)} ·{" "}
          {locationLabel({ area: job.area, locality: job.locality, pincode: job.pincode })}
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
              {job.categories?.name
                ? `Only ${job.categories.name} providers can be assigned. Search and pick who you finalized with, or none if you closed without one.`
                : "Search and pick who you finalized with, or none if you closed without one."}
            </p>
            <SearchableProviderSelect
              options={closeOptions}
              value={closeOptions.some((o) => o.id === closeProvider) ? closeProvider : NONE_PROVIDER}
              noneValue={NONE_PROVIDER}
              emptyMessage={
                job.categories?.name
                  ? `No ${job.categories.name} providers have expressed interest yet.`
                  : "No providers have expressed interest yet."
              }
              onChange={(next) => {
                setCloseProvider(next);
                if (!job) return;
                const offered =
                  next === NONE_PROVIDER
                    ? null
                    : interests.find((i) => i.id === next)?.offered_amount;
                setFinalAmount(defaultFinalAmount(job, offered));
              }}
              disabled={savingStatus}
            />

            <label className="mb-1.5 mt-3 block text-[11px] font-bold text-ink">
              Final amount
            </label>
            <p className="mb-1.5 text-[10.5px] text-ink-soft">
              Min and max budget will both be saved as this amount.
            </p>
            <div className="flex items-center rounded-[12px] border border-line bg-white px-3">
              <span className="mr-1 font-mono font-bold text-green-deep">₹</span>
              <input
                className="w-full py-2.5 font-mono text-sm font-bold outline-none"
                inputMode="numeric"
                placeholder="Enter final amount"
                value={finalAmount}
                disabled={savingStatus}
                onChange={(e) => setFinalAmount(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={savingStatus}
                onClick={() => {
                  setShowClosePicker(false);
                  setFinalizingId(null);
                }}
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
                {savingStatus ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        ) : null}

        {job.status === "closed" && !showClosePicker ? (
          <div className="mt-3">
            <p className="text-[11px] text-ink-soft">
              {selectedInterest?.businesses
                ? `Deal closed with ${selectedInterest.businesses.name}${
                    selectedInterest.businesses.ownerName
                      ? ` · ${selectedInterest.businesses.ownerName}`
                      : ""
                  }${
                    selectedInterest.businesses.ownerPhone
                      ? ` · ${displayPhone(selectedInterest.businesses.ownerPhone)}`
                      : ""
                  }.`
                : "Closed without selecting a provider."}
            </p>
            {!selectedInterest?.businesses ? (
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="rounded-[12px] bg-blue-soft px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-blue-deep">
                    Created
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold leading-snug text-blue-deep">
                    {formatDateTime(job.created_at)}
                  </p>
                </div>
                <div className="rounded-[12px] bg-green-soft px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-green-deep">
                    Closed
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold leading-snug text-green-deep">
                    {formatDateTime(job.updated_at)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <h2 className="font-display text-base font-bold">Interested providers</h2>
        <div className="mt-3 space-y-3">
          {interests.map((i) => {
            const b = i.businesses;
            if (!b) return null;
            const isSelected =
              !!job.closed_with_business_id && b.id === job.closed_with_business_id;
            const isClosedOut = job.status === "closed" && !isSelected;
            const category = categoryDisplayName(b.categories);
            return (
              <div
                key={i.id}
                className={`relative rounded-[18px] border bg-white p-3.5 shadow-card ${
                  isSelected ? "border-green-deep" : "border-line"
                }`}
              >
                {isSelected ? (
                  <span className="absolute -top-2 right-3 rounded-full bg-green-deep px-2 py-1 font-mono text-[9px] font-bold text-white">
                    DEAL FINAL
                  </span>
                ) : isClosedOut ? (
                  <span className="absolute -top-2 right-3 rounded-full bg-ink-faint px-2 py-1 font-mono text-[9px] font-bold text-white">
                    NOT SELECTED
                  </span>
                ) : (
                  <span className="absolute -top-2 right-3 rounded-full bg-ink px-2 py-1 font-mono text-[9px] font-bold text-white">
                    NEAR YOU
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-blue-soft font-display font-bold text-blue-deep">
                    {b.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-snug">{b.name}</p>
                    {category ? (
                      <span className="mt-1.5 inline-block rounded-full bg-blue-soft px-2.5 py-1 text-[10px] font-bold text-blue-deep">
                        {category}
                      </span>
                    ) : null}
                    <p className="mt-1.5 text-[12px] font-semibold text-ink">
                      {b.ownerName?.trim() || "Provider"}
                    </p>
                    {b.ownerPhone ? (
                      <a
                        href={`tel:${b.ownerPhone.replace(/\D/g, "")}`}
                        className="mt-0.5 block font-mono text-[11.5px] font-bold text-blue-deep"
                      >
                        {displayPhone(b.ownerPhone)}
                      </a>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-ink-faint">No contact shared</p>
                    )}
                    <p className="mt-1.5 text-[11.5px] text-ink-soft">
                      {i.offered_amount != null ? (
                        <>
                          Offered <b className="text-ink">₹{i.offered_amount}</b>
                          {" · "}
                        </>
                      ) : null}
                      {b.rating.toFixed(1)} ★
                    </p>
                  </div>
                  {b.ownerPhone ? (
                    <a
                      href={`tel:${b.ownerPhone.replace(/\D/g, "")}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] grad-hero text-white"
                      aria-label={`Call ${b.ownerName ?? b.name}`}
                    >
                      ☎
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-surface text-ink-faint"
                      onClick={() => showToast(`No contact for ${b.name}`)}
                    >
                      ☎
                    </button>
                  )}
                </div>
                {isSelected ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-[12px] bg-blue-soft px-2.5 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-blue-deep">
                        Created
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold leading-snug text-blue-deep">
                        {formatDateTime(job.created_at)}
                      </p>
                    </div>
                    <div className="rounded-[12px] bg-green-soft px-2.5 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-green-deep">
                        Closed
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold leading-snug text-green-deep">
                        {formatDateTime(job.updated_at)}
                      </p>
                    </div>
                  </div>
                ) : null}
                {job.status === "open" &&
                i.status === "waiting" &&
                (!jobCategoryId || i.businesses?.categories?.id === jobCategoryId) ? (
                  <button
                    type="button"
                    disabled={!!finalizingId || savingStatus}
                    onClick={() => openDealFinal(i.id)}
                    className="mt-3 w-full rounded-[14px] border-[1.5px] border-green-deep bg-green-soft py-2.5 text-xs font-bold text-green-deep disabled:opacity-60"
                  >
                    Deal final
                  </button>
                ) : null}
              </div>
            );
          })}
          {!interests.length ? (
            <EmptyState
              icon={Users}
              title="No interest yet"
              message="Providers nearby will see your post. Check back soon for offers."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
