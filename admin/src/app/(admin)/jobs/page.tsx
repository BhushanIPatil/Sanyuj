"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Handshake,
  Heart,
  Pencil,
  Plus,
  SlidersHorizontal,
  Store,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatBudget, formatDateTime, locationLabel } from "@/lib/format";
import { jobStatusBadgeClass, jobStatusLabel } from "@/lib/status";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { TablePageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { JobDetailPanel, type JobRow } from "./JobDetailPanel";
import {
  EMPTY_JOB_FORM,
  JobFormModal,
  type CategoryOption,
  type CustomerOption,
  type JobFormValues,
} from "./JobFormModal";
import { JobDealModal, type DealInterest, type DealProvider } from "./JobDealModal";

const EMPTY_FILTERS = {
  search: "",
  status: "all",
  pincode: "",
  locality: "",
  category: "all",
  deal: "all",
};

function formFromJob(job: JobRow): JobFormValues {
  return {
    customer_id: job.customer_id,
    category_id: job.category_id,
    title: job.title,
    description: job.description,
    pincode: job.pincode,
    locality: job.locality ?? "",
    area: job.area ?? "",
    urgency: (job.urgency as JobFormValues["urgency"]) || "flexible",
    budget_min: job.budget_min != null ? String(job.budget_min) : "",
    budget_max: job.budget_max != null ? String(job.budget_max) : "",
  };
}

async function readError(res: Response) {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error || `Request failed (${res.status})`;
}

export default function JobsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<JobRow[]>([]);
  const [interestsByJob, setInterestsByJob] = useState<Record<string, DealInterest[]>>({});
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [providers, setProviders] = useState<DealProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pincode, setPincode] = useState("");
  const [locality, setLocality] = useState("");
  const [category, setCategory] = useState("all");
  const [deal, setDeal] = useState("all");
  const [selected, setSelected] = useState<JobRow | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [formJob, setFormJob] = useState<JobRow | null>(null);
  const [dealJob, setDealJob] = useState<JobRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [jobsRes, interestsRes, usersRes, catsRes, bizRes] = await Promise.all([
      supabase
        .from("jobs")
        .select(
          "id, customer_id, category_id, title, description, status, urgency, pincode, locality, area, area_id, budget_min, budget_max, created_at, closed_with_business_id, is_active, is_deleted, categories(id, name), profiles(id, full_name, phone, email), businesses(id, name)",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("job_interests")
        .select("id, job_id, business_id, status, offered_amount, businesses(name, category_id, categories(id, name), profiles(full_name))")
        .limit(5000),
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, pincode, locality, area")
        .order("full_name", { ascending: true })
        .limit(500),
      supabase.from("categories").select("id, name").eq("is_deleted", false).order("name"),
      supabase
        .from("businesses")
        .select("id, name, categories(id, name), profiles(full_name, phone)")
        .eq("is_deleted", false)
        .order("name")
        .limit(500),
    ]);

    const grouped: Record<string, DealInterest[]> = {};
    const counts = new Map<string, number>();
    for (const row of (interestsRes.data as (DealInterest & { job_id: string })[] | null) ?? []) {
      grouped[row.job_id] = [...(grouped[row.job_id] ?? []), row];
      counts.set(row.job_id, (counts.get(row.job_id) ?? 0) + 1);
    }

    const list: JobRow[] = ((jobsRes.data as unknown as Omit<JobRow, "interest_count">[]) ?? []).map((job) => ({
      ...job,
      interest_count: counts.get(job.id) ?? 0,
    }));

    setRows(list);
    setInterestsByJob(grouped);
    setCustomers((usersRes.data as CustomerOption[]) ?? []);
    setCategories((catsRes.data as CategoryOption[]) ?? []);
    setProviders((bizRes.data as unknown as DealProvider[]) ?? []);
    setSelected((cur) => (cur ? (list.find((r) => r.id === cur.id) ?? null) : null));
    setDealJob((cur) => (cur ? (list.find((r) => r.id === cur.id) ?? null) : null));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeFilterCount = [
    search.trim() ? 1 : 0,
    status !== "all" ? 1 : 0,
    pincode.trim() ? 1 : 0,
    locality.trim() ? 1 : 0,
    category !== "all" ? 1 : 0,
    deal !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setSearch(EMPTY_FILTERS.search);
    setStatus(EMPTY_FILTERS.status);
    setPincode(EMPTY_FILTERS.pincode);
    setLocality(EMPTY_FILTERS.locality);
    setCategory(EMPTY_FILTERS.category);
    setDeal(EMPTY_FILTERS.deal);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pin = pincode.trim();
    const loc = locality.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "open" && (r.status !== "open" || r.is_deleted)) return false;
      if (status === "closed" && (r.status !== "closed" || r.is_deleted)) return false;
      if (status === "deleted" && !r.is_deleted) return false;
      if (pin && r.pincode !== pin) return false;
      if (loc && !(r.locality ?? "").toLowerCase().includes(loc) && !(r.area ?? "").toLowerCase().includes(loc)) {
        return false;
      }
      if (category !== "all" && r.category_id !== category) return false;
      if (deal === "assigned" && !r.closed_with_business_id) return false;
      if (deal === "unassigned" && r.closed_with_business_id) return false;
      if (q) {
        const hay = `${r.title} ${r.profiles?.full_name ?? ""} ${r.profiles?.phone ?? ""} ${r.profiles?.email ?? ""} ${r.businesses?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, status, pincode, locality, category, deal]);

  const stats = useMemo(() => {
    const total = rows.length;
    const open = rows.filter((r) => r.status === "open" && !r.is_deleted).length;
    const closed = rows.filter((r) => r.status === "closed" && !r.is_deleted).length;
    const assigned = rows.filter((r) => !!r.closed_with_business_id && !r.is_deleted).length;
    const interests = rows.reduce((sum, r) => sum + r.interest_count, 0);
    const deleted = rows.filter((r) => r.is_deleted).length;
    return { total, open, closed, assigned, interests, deleted };
  }, [rows]);

  const closePanel = useCallback(() => setSelected(null), []);

  const openCreate = () => {
    setFormError("");
    setFormJob(null);
    setFormMode("create");
  };

  const openEdit = (job: JobRow) => {
    setSelected(null);
    setFormError("");
    setFormJob(job);
    setFormMode("edit");
  };

  const openDeal = (job: JobRow) => {
    setSelected(null);
    setFormError("");
    setDealJob(job);
  };

  const submitForm = async (values: JobFormValues) => {
    setSaving(true);
    setFormError("");
    try {
      if (formMode === "create") {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error(await readError(res));
        showToast("Job created");
      } else if (formJob) {
        const res = await fetch(`/api/jobs/${formJob.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error(await readError(res));
        showToast("Job updated");
      }
      setFormMode(null);
      setFormJob(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save job");
    } finally {
      setSaving(false);
    }
  };

  const runDeal = async (action: string, extra?: Record<string, unknown>) => {
    if (!dealJob) return;
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch(`/api/jobs/${dealJob.id}/deal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) throw new Error(await readError(res));
      showToast(action === "reopen" ? "Job reopened" : "Deal updated");
      setDealJob(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not update deal");
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (job: JobRow) => {
    const ok = await confirm({
      title: "Delete job?",
      message: `This hides “${job.title}” and its interests. Customers and providers will no longer see it.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast(await readError(res));
      return;
    }
    showToast("Job deleted");
    setSelected(null);
    await load();
  };

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        title="Jobs management"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="btn-secondary inline-flex w-auto items-center gap-2 py-2.5"
            >
              <Plus size={16} />
              Create job
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="btn-secondary inline-flex w-auto items-center gap-2 py-2.5"
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal size={16} />
              Filters
              {activeFilterCount > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-soft px-1.5 text-[11px] font-bold text-blue-deep">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        }
      />

      {filtersOpen ? (
        <div className="mt-4">
          <FilterBar>
            <FilterField label="Search" className="min-w-[200px] flex-[2]">
              <FilterInput value={search} onChange={setSearch} placeholder="Title, customer, or provider" />
            </FilterField>
            <FilterField label="Status">
              <FilterSelect value={status} onChange={setStatus}>
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="deleted">Deleted</option>
              </FilterSelect>
            </FilterField>
            <FilterField label="Category">
              <FilterSelect value={category} onChange={setCategory}>
                <option value="all">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FilterSelect>
            </FilterField>
            <FilterField label="Deal">
              <FilterSelect value={deal} onChange={setDeal}>
                <option value="all">All</option>
                <option value="assigned">Assigned provider</option>
                <option value="unassigned">No provider</option>
              </FilterSelect>
            </FilterField>
            <FilterField label="Pincode">
              <FilterInput value={pincode} onChange={setPincode} placeholder="e.g. 425001" />
            </FilterField>
            <FilterField label="Locality">
              <FilterInput value={locality} onChange={setLocality} placeholder="Locality or area" />
            </FilterField>
            {activeFilterCount > 0 ? (
              <div className="flex items-end">
                <button type="button" onClick={clearFilters} className="h-[46px] text-sm font-bold text-blue-deep hover:underline">
                  Clear
                </button>
              </div>
            ) : null}
          </FilterBar>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total jobs" value={stats.total} icon={Briefcase} tone="blue" />
        <StatCard label="Open" value={stats.open} hint={`${stats.deleted} deleted`} icon={Briefcase} tone="green" />
        <StatCard
          label="Closed deals"
          value={stats.closed}
          hint={`${stats.assigned} assigned to a provider`}
          icon={Store}
          tone="indigo"
        />
        <StatCard label="Interests" value={stats.interests} icon={Heart} tone="rose" />
      </div>

      <div className="mt-4">
        <DataTable
          rows={filtered}
          selectedId={selected?.id}
          emptyMessage="No jobs match your filters."
          onRowClick={setSelected}
          defaultSortKey="posted"
          defaultSortDir="desc"
          columns={[
            {
              key: "job",
              header: "Job",
              sortValue: (row) => row.title,
              render: (row) => (
                <div>
                  <p className="font-semibold">{row.title}</p>
                  <p className="text-xs text-ink-soft">{row.categories?.name ?? "—"}</p>
                </div>
              ),
            },
            {
              key: "customer",
              header: "Customer",
              sortValue: (row) => row.profiles?.full_name || row.profiles?.phone || "",
              render: (row) => (
                <div>
                  <p className="font-medium">{row.profiles?.full_name || "—"}</p>
                  <p className="text-xs text-ink-soft">{row.profiles?.phone ?? "—"}</p>
                </div>
              ),
            },
            {
              key: "location",
              header: "Location",
              sortValue: (row) => locationLabel(row.pincode, row.locality, row.area),
              render: (row) => (
                <span className="text-ink-soft">{locationLabel(row.pincode, row.locality, row.area)}</span>
              ),
            },
            {
              key: "interests",
              header: "Interests",
              sortValue: (row) => row.interest_count,
              render: (row) => <span className="font-semibold">{row.interest_count}</span>,
            },
            {
              key: "status",
              header: "Status",
              sortValue: (row) => `${row.is_deleted ? 2 : row.status === "open" ? 0 : 1}`,
              render: (row) => (
                <div className="space-y-1">
                  <Badge className={jobStatusBadgeClass(row.status)}>{jobStatusLabel(row.status)}</Badge>
                  {row.is_deleted ? <p className="text-xs text-rose">Deleted</p> : null}
                  {row.businesses ? <p className="text-xs text-ink-soft">with {row.businesses.name}</p> : null}
                </div>
              ),
            },
            {
              key: "posted",
              header: "Posted",
              sortValue: (row) => row.created_at,
              render: (row) => <span className="text-ink-soft">{formatDateTime(row.created_at)}</span>,
            },
            {
              key: "actions",
              header: "Actions",
              className: "w-36",
              render: (row) => (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => openEdit(row)}
                    className="rounded-[10px] border border-line p-2 hover:bg-surface"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    title="Assign provider"
                    onClick={() => openDeal(row)}
                    className="rounded-[10px] border border-line p-2 hover:bg-surface"
                  >
                    <Handshake size={14} />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => void deleteJob(row)}
                    className="rounded-[10px] border border-line p-2 text-rose hover:bg-rose-soft"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {selected ? (
        <JobDetailPanel
          key={selected.id}
          job={selected}
          interests={interestsByJob[selected.id] ?? []}
          onClose={closePanel}
          onEdit={() => openEdit(selected)}
          onDeal={() => openDeal(selected)}
          onDelete={() => void deleteJob(selected)}
        />
      ) : null}

      {formMode ? (
        <JobFormModal
          key={formMode + (formJob?.id ?? "new")}
          mode={formMode}
          initial={formJob ? formFromJob(formJob) : EMPTY_JOB_FORM}
          customers={customers}
          categories={categories}
          saving={saving}
          error={formError}
          onClose={() => {
            setFormMode(null);
            setFormJob(null);
          }}
          onSubmit={(values) => void submitForm(values)}
        />
      ) : null}

      {dealJob ? (
        <JobDealModal
          key={dealJob.id}
          title={dealJob.title}
          status={dealJob.status}
          categoryId={dealJob.category_id}
          categoryName={dealJob.categories?.name ?? null}
          assignedBusinessId={dealJob.closed_with_business_id}
          interests={interestsByJob[dealJob.id] ?? []}
          providers={providers}
          saving={saving}
          error={formError}
          onClose={() => setDealJob(null)}
          onAssign={(businessId, finalAmount) =>
            void runDeal("assign", { business_id: businessId, final_amount: finalAmount || null })
          }
          onCloseUnassigned={() => void runDeal("close_unassigned")}
          onReopen={() => void runDeal("reopen")}
        />
      ) : null}
    </div>
  );
}
