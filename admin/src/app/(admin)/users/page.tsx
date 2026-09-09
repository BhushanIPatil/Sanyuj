"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Store,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, initials, locationLabel } from "@/lib/format";
import { accountStatusBadge, accountStatusLabel } from "@/lib/status";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { TablePageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { UserDetailPanel, type UserBusiness, type UserRow } from "./UserDetailPanel";
import {
  EMPTY_USER_FORM,
  PasswordModal,
  UserFormModal,
  type UserFormValues,
} from "./UserFormModal";

type ProfileRow = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  pincode: string | null;
  locality: string | null;
  area: string | null;
  area_id: string | null;
  address: string | null;
  onboarding_complete: boolean;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

const EMPTY_FILTERS = {
  search: "",
  status: "all",
  role: "all",
  onboarded: "all",
  pincode: "",
};

function statusOf(row: UserRow): UserFormValues["status"] {
  if (row.is_deleted) return "deleted";
  if (!row.is_active) return "inactive";
  return "active";
}

function formFromUser(row: UserRow): UserFormValues {
  return {
    full_name: row.full_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    password: "",
    pincode: row.pincode ?? "",
    locality: row.locality ?? "",
    area: row.area ?? "",
    area_id: row.area_id ?? "",
    address: row.address ?? "",
    onboarding_complete: row.onboarding_complete,
    status: statusOf(row),
  };
}

async function readError(res: Response) {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error || `Request failed (${res.status})`;
}

export default function UsersPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [onboarded, setOnboarded] = useState("all");
  const [pincode, setPincode] = useState("");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [formUser, setFormUser] = useState<UserRow | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [profilesRes, bizRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, email, phone, full_name, pincode, locality, area, area_id, address, onboarding_complete, is_active, is_deleted, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("businesses")
        .select("id, owner_id, name, is_active, is_deleted, categories(name, is_other)")
        .limit(500),
    ]);

    const businesses = (bizRes.data as unknown as UserBusiness[]) ?? [];
    const bizByOwner = new Map(businesses.map((b) => [b.owner_id, b]));

    const list: UserRow[] = ((profilesRes.data as ProfileRow[]) ?? []).map((p) => {
      return {
        ...p,
        business: bizByOwner.get(p.id) ?? null,
      };
    });

    setRows(list);
    setSelected((cur) => (cur ? (list.find((r) => r.id === cur.id) ?? null) : null));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeFilterCount = [
    search.trim() ? 1 : 0,
    status !== "all" ? 1 : 0,
    role !== "all" ? 1 : 0,
    onboarded !== "all" ? 1 : 0,
    pincode.trim() ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setSearch(EMPTY_FILTERS.search);
    setStatus(EMPTY_FILTERS.status);
    setRole(EMPTY_FILTERS.role);
    setOnboarded(EMPTY_FILTERS.onboarded);
    setPincode(EMPTY_FILTERS.pincode);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pin = pincode.trim();
    return rows.filter((r) => {
      if (status === "active" && !(r.is_active && !r.is_deleted)) return false;
      if (status === "inactive" && !(!r.is_active && !r.is_deleted)) return false;
      if (status === "deleted" && !r.is_deleted) return false;
      if (role === "provider" && !r.business) return false;
      if (role === "customer" && r.business) return false;
      if (onboarded === "yes" && !r.onboarding_complete) return false;
      if (onboarded === "no" && r.onboarding_complete) return false;
      if (pin && r.pincode !== pin) return false;
      if (q) {
        const hay = `${r.full_name ?? ""} ${r.email ?? ""} ${r.phone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, status, role, onboarded, pincode]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.is_active && !r.is_deleted).length;
    const inactive = rows.filter((r) => !r.is_active && !r.is_deleted).length;
    const deleted = rows.filter((r) => r.is_deleted).length;
    const providers = rows.filter((r) => r.business).length;
    const customers = total - providers;
    return { total, active, inactive, deleted, providers, customers };
  }, [rows]);

  const closePanel = useCallback(() => setSelected(null), []);

  const openCreate = () => {
    setFormError("");
    setFormUser(null);
    setFormMode("create");
  };

  const openEdit = (row: UserRow) => {
    setSelected(null);
    setFormError("");
    setFormUser(row);
    setFormMode("edit");
  };

  const openPassword = (row: UserRow) => {
    setSelected(null);
    setFormError("");
    setPasswordUser(row);
  };

  const submitForm = async (values: UserFormValues) => {
    setSaving(true);
    setFormError("");
    try {
      if (formMode === "create") {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            is_active: values.status !== "inactive",
          }),
        });
        if (!res.ok) throw new Error(await readError(res));
        showToast("User created");
      } else if (formUser) {
        const res = await fetch(`/api/users/${formUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error(await readError(res));
        showToast("User updated");
      }
      setFormMode(null);
      setFormUser(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save user");
    } finally {
      setSaving(false);
    }
  };

  const submitPassword = async (password: string) => {
    if (!passwordUser) return;
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch(`/api/users/${passwordUser.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error(await readError(res));
      showToast("Password updated");
      setPasswordUser(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (row: UserRow) => {
    const ok = await confirm({
      title: "Delete user?",
      message: `This deactivates ${row.full_name || row.email || "this account"} and hides their business data. You can restore later.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/users/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast(await readError(res));
      return;
    }
    showToast("User deleted");
    setSelected(null);
    await load();
  };

  const restoreUser = async (row: UserRow) => {
    const ok = await confirm({
      title: "Restore user?",
      message: `Restore ${row.full_name || row.email || "this account"} and their related records.`,
      confirmLabel: "Restore",
    });
    if (!ok) return;
    const res = await fetch(`/api/users/${row.id}/restore`, { method: "POST" });
    if (!res.ok) {
      showToast(await readError(res));
      return;
    }
    showToast("User restored");
    await load();
  };

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        title="Users management"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="btn-secondary inline-flex w-auto items-center gap-2 py-2.5"
            >
              <Plus size={16} />
              Create user
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
              <FilterInput
                value={search}
                onChange={setSearch}
                placeholder="Name, email, or phone"
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
            <FilterField label="Account type">
              <FilterSelect value={role} onChange={setRole}>
                <option value="all">All</option>
                <option value="provider">Provider</option>
                <option value="customer">Customer</option>
              </FilterSelect>
            </FilterField>
            <FilterField label="Onboarded">
              <FilterSelect value={onboarded} onChange={setOnboarded}>
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </FilterSelect>
            </FilterField>
            <FilterField label="Pincode">
              <FilterInput value={pincode} onChange={setPincode} placeholder="e.g. 425001" />
            </FilterField>
            {activeFilterCount > 0 ? (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-[46px] text-sm font-bold text-blue-deep hover:underline"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </FilterBar>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={stats.total} icon={Users} tone="blue" />
        <StatCard
          label="Active"
          value={stats.active}
          hint={`${stats.inactive} inactive · ${stats.deleted} deleted`}
          icon={UserCheck}
          tone="green"
        />
        <StatCard
          label="Providers"
          value={stats.providers}
          hint={`${stats.customers} customers`}
          icon={Store}
          tone="indigo"
        />
      </div>

      <div className="mt-4">
        <DataTable
          rows={filtered}
          selectedId={selected?.id}
          emptyMessage="No users match your filters."
          onRowClick={setSelected}
          defaultSortKey="joined"
          defaultSortDir="desc"
          columns={[
            {
              key: "user",
              header: "User",
              sortValue: (row) => row.full_name || row.email || "",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-soft text-xs font-bold text-blue-deep">
                    {initials(row.full_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{row.full_name || "—"}</p>
                    <p className="truncate text-xs text-ink-soft">{row.email || "—"}</p>
                    {row.phone ? <p className="text-xs text-ink-faint">{row.phone}</p> : null}
                  </div>
                </div>
              ),
            },
            {
              key: "type",
              header: "Type",
              sortValue: (row) => (row.business ? `1 ${row.business.name}` : "0"),
              render: (row) =>
                row.business ? (
                  <div>
                    <Badge className="bg-indigo-soft text-indigo">Provider</Badge>
                    <p className="mt-1 max-w-[140px] truncate text-xs text-ink-soft">{row.business.name}</p>
                  </div>
                ) : (
                  <Badge className="bg-surface text-ink-soft">Customer</Badge>
                ),
            },
            {
              key: "location",
              header: "Location",
              sortValue: (row) => locationLabel(row.pincode, row.locality, row.area),
              render: (row) => (
                <span className="text-ink-soft">
                  {locationLabel(row.pincode, row.locality, row.area)}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              sortValue: (row) => (row.is_deleted ? 2 : row.is_active ? 0 : 1),
              render: (row) => (
                <Badge className={accountStatusBadge(row.is_active, row.is_deleted)}>
                  {accountStatusLabel(row.is_active, row.is_deleted)}
                </Badge>
              ),
            },
            {
              key: "joined",
              header: "Joined",
              sortValue: (row) => row.created_at,
              render: (row) => (
                <span className="text-ink-soft">{formatDateTime(row.created_at)}</span>
              ),
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
                    title="Change password"
                    onClick={() => openPassword(row)}
                    className="rounded-[10px] border border-line p-2 hover:bg-surface"
                  >
                    <KeyRound size={14} />
                  </button>
                  {row.is_deleted ? (
                    <button
                      type="button"
                      title="Restore"
                      onClick={() => void restoreUser(row)}
                      className="rounded-[10px] border border-line p-2 hover:bg-surface"
                    >
                      <RotateCcw size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => void deleteUser(row)}
                      className="rounded-[10px] border border-line p-2 text-rose hover:bg-rose-soft"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {selected ? (
        <UserDetailPanel
          key={selected.id}
          user={selected}
          onClose={closePanel}
          onEdit={() => openEdit(selected)}
          onPassword={() => openPassword(selected)}
          onDelete={() => void deleteUser(selected)}
          onRestore={() => void restoreUser(selected)}
        />
      ) : null}

      {formMode ? (
        <UserFormModal
          key={formMode + (formUser?.id ?? "new")}
          mode={formMode}
          initial={formUser ? formFromUser(formUser) : EMPTY_USER_FORM}
          saving={saving}
          error={formError}
          onClose={() => {
            setFormMode(null);
            setFormUser(null);
          }}
          onSubmit={(values) => void submitForm(values)}
        />
      ) : null}

      {passwordUser ? (
        <PasswordModal
          key={passwordUser.id}
          name={passwordUser.full_name || passwordUser.email || "this user"}
          saving={saving}
          error={formError}
          onClose={() => setPasswordUser(null)}
          onSubmit={(password) => void submitPassword(password)}
        />
      ) : null}
    </div>
  );
}
