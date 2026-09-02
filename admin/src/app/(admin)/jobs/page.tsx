"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatBudget, formatDateTime, locationLabel } from "@/lib/format";
import { jobStatusBadgeClass, jobStatusLabel } from "@/lib/status";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/ui/FilterBar";
import { TablePageSkeleton } from "@/components/ui/Skeleton";

type JobRow = {
  id: string;
  title: string;
  status: string;
  pincode: string;
  locality: string | null;
  area: string | null;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  closed_with_business_id: string | null;
  categories: { name: string } | null;
  profiles: { full_name: string | null; phone: string } | null;
  businesses: { name: string } | null;
  interest_count: number;
};

export default function JobsPage() {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pincode, setPincode] = useState("");
  const [locality, setLocality] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("jobs")
        .select(
          "id, title, status, pincode, locality, area, budget_min, budget_max, created_at, closed_with_business_id, categories(name), profiles(full_name, phone), businesses(name)",
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (status !== "all") query = query.eq("status", status);
      if (pincode.trim()) query = query.eq("pincode", pincode.trim());
      if (locality.trim()) query = query.ilike("locality", `%${locality.trim()}%`);

      const { data } = await query;
      const list = (data as unknown as JobRow[]) ?? [];

      const withCounts = await Promise.all(
        list.map(async (job) => {
          const { count } = await supabase
            .from("job_interests")
            .select("*", { count: "exact", head: true })
            .eq("job_id", job.id);
          return { ...job, interest_count: count ?? 0 };
        }),
      );

      setRows(withCounts);
      setLoading(false);
    };
    void load();
  }, [status, pincode, locality]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.profiles?.full_name?.toLowerCase().includes(q) ?? false) ||
        (r.profiles?.phone.toLowerCase().includes(q) ?? false),
    );
  }, [rows, search]);

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Marketplace"
        title="Jobs"
        description={`${filtered.length} job${filtered.length === 1 ? "" : "s"}`}
      />

      <div className="mt-6">
        <FilterBar>
          <FilterField label="Search" className="min-w-[200px] flex-[2]">
            <FilterInput value={search} onChange={setSearch} placeholder="Title, customer name, or phone" />
          </FilterField>
          <FilterField label="Status">
            <FilterSelect value={status} onChange={setStatus}>
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </FilterSelect>
          </FilterField>
          <FilterField label="Pincode">
            <FilterInput value={pincode} onChange={setPincode} placeholder="e.g. 425001" />
          </FilterField>
          <FilterField label="Locality">
            <FilterInput value={locality} onChange={setLocality} placeholder="Area name" />
          </FilterField>
        </FilterBar>
      </div>

      <div className="mt-4">
        <DataTable
          rows={filtered}
          emptyMessage="No jobs match your filters."
          columns={[
            {
              key: "job",
              header: "Job",
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
              render: (row) => (
                <span className="text-ink-soft">{locationLabel(row.pincode, row.locality, row.area)}</span>
              ),
            },
            {
              key: "budget",
              header: "Budget",
              render: (row) => (
                <span className="text-ink-soft">
                  {formatBudget(row.budget_min, row.budget_max)}
                </span>
              ),
            },
            {
              key: "interests",
              header: "Interests",
              render: (row) => <span className="font-semibold">{row.interest_count}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <div className="space-y-1">
                  <Badge className={jobStatusBadgeClass(row.status)}>
                    {jobStatusLabel(row.status)}
                  </Badge>
                  {row.status === "closed" && row.businesses ? (
                    <p className="text-xs text-ink-soft">with {row.businesses.name}</p>
                  ) : null}
                </div>
              ),
            },
            {
              key: "posted",
              header: "Posted",
              render: (row) => (
                <span className="text-ink-soft">{formatDateTime(row.created_at)}</span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
