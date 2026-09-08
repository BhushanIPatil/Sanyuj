"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { LivePageSkeleton } from "@/components/ui/Skeleton";
import { Radio } from "lucide-react";

type LiveRow = {
  id: string;
  pincode: string;
  started_at: string;
  ends_at: string;
  is_active: boolean;
  is_deleted: boolean;
  businesses: {
    name: string;
    profiles: { full_name: string | null; locality: string | null } | null;
  } | null;
};

export default function LivePage() {
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pincode, setPincode] = useState("");
  const [locality, setLocality] = useState("");
  const [activeOnly, setActiveOnly] = useState("active");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("live_sessions")
        .select(
          "id, pincode, started_at, ends_at, is_active, is_deleted, businesses(name, profiles(full_name, locality))",
        )
        .order("started_at", { ascending: false })
        .limit(500);

      if (pincode.trim()) query = query.eq("pincode", pincode.trim());
      if (activeOnly === "active") query = query.eq("is_active", true).eq("is_deleted", false);
      if (activeOnly === "ended") query = query.eq("is_active", false);

      const { data } = await query;
      let list = (data as unknown as LiveRow[]) ?? [];

      if (locality.trim()) {
        const q = locality.trim().toLowerCase();
        list = list.filter((r) =>
          r.businesses?.profiles?.locality?.toLowerCase().includes(q),
        );
      }

      setRows(list);
      setLoading(false);
    };
    void load();
  }, [pincode, locality, activeOnly]);

  const activeCount = useMemo(
    () => rows.filter((r) => r.is_active && !r.is_deleted).length,
    [rows],
  );

  if (loading) return <LivePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader title="Live sessions" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Matching sessions" value={rows.length} icon={Radio} tone="teal" />
        <StatCard label="Active in results" value={activeCount} icon={Radio} tone="green" />
      </div>

      <div className="mt-6">
        <FilterBar>
          <FilterField label="Status">
            <FilterSelect value={activeOnly} onChange={setActiveOnly}>
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="ended">Ended</option>
            </FilterSelect>
          </FilterField>
          <FilterField label="Pincode">
            <FilterInput value={pincode} onChange={setPincode} placeholder="e.g. 425001" />
          </FilterField>
          <FilterField label="Locality">
            <FilterInput value={locality} onChange={setLocality} placeholder="Owner locality" />
          </FilterField>
        </FilterBar>
      </div>

      <div className="mt-4">
        <DataTable
          rows={rows}
          emptyMessage="No live sessions match your filters."
          defaultSortKey="started"
          defaultSortDir="desc"
          columns={[
            {
              key: "provider",
              header: "Provider",
              sortValue: (row) => row.businesses?.name || row.businesses?.profiles?.full_name || "",
              render: (row) => (
                <div>
                  <p className="font-semibold">{row.businesses?.name ?? "—"}</p>
                  <p className="text-xs text-ink-soft">
                    {row.businesses?.profiles?.full_name ?? "—"}
                  </p>
                </div>
              ),
            },
            {
              key: "pincode",
              header: "Pincode",
              sortValue: (row) => row.pincode,
              render: (row) => <span>{row.pincode}</span>,
            },
            {
              key: "locality",
              header: "Locality",
              sortValue: (row) => row.businesses?.profiles?.locality ?? "",
              render: (row) => (
                <span className="text-ink-soft">
                  {row.businesses?.profiles?.locality ?? "—"}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              sortValue: (row) => (row.is_active && !row.is_deleted ? 0 : 1),
              render: (row) => (
                <Badge
                  className={
                    row.is_active && !row.is_deleted
                      ? "bg-green-soft text-green-deep"
                      : "bg-surface text-ink-soft"
                  }
                >
                  {row.is_active && !row.is_deleted ? "Live" : "Ended"}
                </Badge>
              ),
            },
            {
              key: "started",
              header: "Started",
              sortValue: (row) => row.started_at,
              render: (row) => (
                <span className="text-ink-soft">{formatDateTime(row.started_at)}</span>
              ),
            },
            {
              key: "ends",
              header: "Ends",
              sortValue: (row) => row.ends_at,
              render: (row) => (
                <span className="text-ink-soft">{formatDateTime(row.ends_at)}</span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
