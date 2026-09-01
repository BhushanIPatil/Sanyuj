"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, initials, locationLabel } from "@/lib/format";
import { accountStatusBadge, accountStatusLabel } from "@/lib/status";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/ui/FilterBar";
import { TablePageSkeleton } from "@/components/ui/Skeleton";

type UserRow = {
  id: string;
  phone: string;
  full_name: string | null;
  pincode: string | null;
  locality: string | null;
  onboarding_complete: boolean;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
};

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pincode, setPincode] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      let query = supabase
        .from("profiles")
        .select(
          "id, phone, full_name, pincode, locality, onboarding_complete, is_active, is_deleted, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (pincode.trim()) query = query.eq("pincode", pincode.trim());
      if (status === "active") query = query.eq("is_active", true).eq("is_deleted", false);
      if (status === "inactive") query = query.eq("is_active", false).eq("is_deleted", false);
      if (status === "deleted") query = query.eq("is_deleted", true);

      const { data } = await query;
      setRows((data as UserRow[]) ?? []);
      setLoading(false);
    };
    void load();
  }, [status, pincode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.phone.toLowerCase().includes(q) ||
        (r.full_name?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, search]);

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Accounts"
        title="Users"
        description={`${filtered.length} user account${filtered.length === 1 ? "" : "s"}`}
      />

      <div className="mt-6">
        <FilterBar>
          <FilterField label="Search" className="min-w-[200px] flex-[2]">
            <FilterInput
              value={search}
              onChange={setSearch}
              placeholder="Name or phone"
            />
          </FilterField>
          <FilterField label="Status">
            <FilterSelect value={status} onChange={setStatus}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="deleted">Deleted</option>
            </FilterSelect>
          </FilterField>
          <FilterField label="Pincode">
            <FilterInput value={pincode} onChange={setPincode} placeholder="e.g. 425001" />
          </FilterField>
        </FilterBar>
      </div>

      <div className="mt-4">
        <DataTable
          rows={filtered}
          emptyMessage="No users match your filters."
          columns={[
            {
              key: "user",
              header: "User",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-soft text-xs font-bold text-blue-deep">
                    {initials(row.full_name)}
                  </span>
                  <div>
                    <p className="font-semibold">{row.full_name || "—"}</p>
                    <p className="text-xs text-ink-soft">{row.phone}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "location",
              header: "Location",
              render: (row) => (
                <span className="text-ink-soft">
                  {locationLabel(row.pincode, row.locality)}
                </span>
              ),
            },
            {
              key: "onboarding",
              header: "Onboarded",
              render: (row) => (
                <Badge
                  className={
                    row.onboarding_complete
                      ? "bg-green-soft text-green-deep"
                      : "bg-amber-soft text-amber"
                  }
                >
                  {row.onboarding_complete ? "Yes" : "No"}
                </Badge>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <Badge className={accountStatusBadge(row.is_active, row.is_deleted)}>
                  {accountStatusLabel(row.is_active, row.is_deleted)}
                </Badge>
              ),
            },
            {
              key: "joined",
              header: "Joined",
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
