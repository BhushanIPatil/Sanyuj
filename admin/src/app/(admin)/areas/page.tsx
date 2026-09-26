"use client";

import { Plus, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterField, FilterInput } from "@/components/ui/FilterBar";
import { TablePageSkeleton } from "@/components/ui/Skeleton";
import { mergeLocalities } from "@/lib/geo/localities";
import type { PostalLocality } from "@/lib/geo/postal";

type LocalityRow = {
  id: string;
  pincode: string;
  name: string;
  is_active: boolean;
  is_deleted: boolean;
};

type AreaRow = {
  id: string;
  locality_id: string;
  name: string;
  is_active: boolean;
  is_deleted: boolean;
};

export default function AreasPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [localities, setLocalities] = useState<LocalityRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [coverageCounts, setCoverageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [pincode, setPincode] = useState("");
  const [lookup, setLookup] = useState<{
    pincode: string;
    localities: PostalLocality[];
    loading: boolean;
    message: string;
  }>({ pincode: "", localities: [], loading: false, message: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<{ type: "none" } | { type: "create" } | { type: "edit"; item: AreaRow }>({
    type: "none",
  });
  const [form, setForm] = useState({ name: "", is_active: true });

  const load = useCallback(async () => {
    const supabase = createClient();
    const [locRes, areaRes, adRes, noticeRes] = await Promise.all([
      supabase
        .from("localities")
        .select("id, pincode, name, is_active, is_deleted")
        .order("pincode", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("areas").select("id, locality_id, name, is_active, is_deleted").order("name"),
      supabase.from("ad_service_areas").select("locality_id").eq("is_deleted", false),
      supabase.from("notice_service_areas").select("locality_id").eq("is_deleted", false),
    ]);
    const locs = (locRes.data as LocalityRow[]) ?? [];
    const areaRows = (areaRes.data as AreaRow[]) ?? [];
    const counts: Record<string, number> = {};
    for (const row of [...(adRes.data ?? []), ...(noticeRes.data ?? [])] as Array<{ locality_id: string | null }>) {
      if (!row.locality_id) continue;
      counts[row.locality_id] = (counts[row.locality_id] ?? 0) + 1;
    }
    setLocalities(locs);
    setAreas(areaRows);
    setCoverageCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Load persisted rows on mount; state updates happen after the database requests.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pincode)) return;
    const controller = new AbortController();
    async function fetchLocalities() {
      setLookup({ pincode, localities: [], loading: true, message: "" });
      try {
        const res = await fetch(`/api/geo/pincode/${pincode}`, { signal: controller.signal });
        const data = (await res.json()) as {
          localities?: PostalLocality[];
          source?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Could not load localities");
        if (controller.signal.aborted) return;
        setLookup({
          pincode,
          localities: data.localities ?? [],
          loading: false,
          message: data.source === "cache"
            ? "Postal lookup is unavailable. Showing saved localities only."
            : "",
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setLookup({
          pincode,
          localities: [],
          loading: false,
          message: `${error instanceof Error ? error.message : "Could not load localities"}. Showing saved localities only.`,
        });
      }
    }
    void fetchLocalities();
    return () => controller.abort();
  }, [pincode]);

  const filteredLocalities = useMemo<Array<Pick<LocalityRow, "id" | "pincode" | "name">>>(() => {
    const saved = localities.filter((l) => !l.is_deleted && l.pincode.includes(pincode));
    if (!/^[1-9]\d{5}$/.test(pincode) || lookup.pincode !== pincode) return saved;
    return mergeLocalities(lookup.localities, saved).map((l) => ({
      ...l,
      id: l.id ?? `postal:${pincode}:${l.name.toLowerCase()}`,
      pincode,
    }));
  }, [localities, pincode, lookup]);

  const uncovered = useMemo(
    () =>
      filteredLocalities.filter((l) => {
        const used = (coverageCounts[l.id] ?? 0) > 0;
        const hasAreas = areas.some((a) => a.locality_id === l.id && !a.is_deleted);
        return used && !hasAreas;
      }),
    [filteredLocalities, coverageCounts, areas],
  );

  const selected = filteredLocalities.find((l) => l.id === selectedId) ?? null;
  const selectedAreas = areas.filter((a) => a.locality_id === selectedId && !a.is_deleted);

  const saveArea = async () => {
    if (!selected || !form.name.trim() || saving) {
      showToast("Area name is required");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      let localityId = selected.id;
      if (localityId.startsWith("postal:")) {
        const { data, error } = await supabase.rpc("upsert_locality", {
          p_pincode: selected.pincode,
          p_name: selected.name,
        });
        if (error) throw error;
        if (!data) throw new Error("Could not save locality");
        localityId = data as string;
      }
      const payload = {
        locality_id: localityId,
        name: form.name.trim(),
        is_active: form.is_active,
        is_deleted: false,
      };
      const { error } = modal.type === "edit"
        ? await supabase.from("areas").update(payload).eq("id", modal.item.id)
        : await supabase.from("areas").insert(payload);
      if (error) throw error;
      showToast(modal.type === "edit" ? "Area updated" : "Area added");
      setSelectedId(localityId);
      setModal({ type: "none" });
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : (error as { message?: string }).message ?? "Could not save area");
    } finally {
      setSaving(false);
    }
  };

  const deleteArea = async (item: AreaRow) => {
    const ok = await confirm({
      title: "Remove area?",
      message: `"${item.name}" will be hidden from pickers.`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("areas")
      .update({ is_deleted: true, is_active: false })
      .eq("id", item.id);
    if (error) showToast(error.message);
    else {
      showToast("Area removed");
      void load();
    }
  };

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader title="Areas" />

      <div className="mt-6">
        <FilterBar>
          <FilterField label="Pincode">
            <FilterInput value={pincode} onChange={(value) => {
              setPincode(value.replace(/\D/g, "").slice(0, 6));
              setSelectedId(null);
            }} placeholder="e.g. 425001" />
          </FilterField>
        </FilterBar>
      </div>

      {uncovered.length > 0 ? (
        <section className="mt-6 rounded-[18px] border border-line bg-white p-4 shadow-card">
          <h2 className="font-display text-base font-bold">Localities used by coverage entries, no areas yet</h2>
          <p className="mt-1 text-xs text-ink-soft">Seed these first so customers can pick a colony.</p>
          <ul className="mt-3 space-y-2">
            {uncovered.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  className="text-sm font-semibold text-blue-deep"
                  onClick={() => setSelectedId(l.id)}
                >
                  {l.name} · {l.pincode} ({coverageCounts[l.id] ?? 0} coverage entries)
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Localities</h2>
          <p className="mb-3 text-xs text-ink-soft" role="status">
            {lookup.pincode === pincode && lookup.loading
              ? "Loading localities from the postal lookup…"
              : lookup.pincode === pincode && lookup.message
                ? lookup.message
                : "Enter a 6-digit pincode to find localities. A new locality is saved when you add its first area."}
          </p>
          <DataTable
            rows={filteredLocalities}
            emptyMessage="No localities found. Enter a valid 6-digit pincode to look up localities."
            defaultSortKey="name"
            defaultSortDir="asc"
            columns={[
              {
                key: "name",
                header: "Locality",
                sortValue: (r) => r.name,
                render: (r) => (
                  <button
                    type="button"
                    className={`text-left font-semibold ${selectedId === r.id ? "text-blue-deep" : ""}`}
                    onClick={() => setSelectedId(r.id)}
                  >
                    {r.name}
                  </button>
                ),
              },
              { key: "pincode", header: "Pincode", sortValue: (r) => r.pincode, render: (r) => <span className="font-mono text-xs">{r.pincode}</span> },
              {
                key: "areas",
                header: "Areas",
                sortValue: (r) => areas.filter((a) => a.locality_id === r.id && !a.is_deleted).length,
                render: (r) => (
                  <span className="text-ink-soft">
                    {areas.filter((a) => a.locality_id === r.id && !a.is_deleted).length}
                  </span>
                ),
              },
              {
                key: "coverage entries",
                header: "Coverage entries",
                sortValue: (r) => coverageCounts[r.id] ?? 0,
                render: (r) => <span className="text-ink-soft">{coverageCounts[r.id] ?? 0}</span>,
              },
            ]}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              {selected ? `Areas in ${selected.name}` : "Select a locality"}
            </h2>
            {selected ? (
              <button
                type="button"
                onClick={() => {
                  setForm({ name: "", is_active: true });
                  setModal({ type: "create" });
                }}
                className="btn-secondary inline-flex w-auto items-center gap-2 py-2 text-sm"
              >
                <Plus size={14} />
                Add area
              </button>
            ) : null}
          </div>
          {!selected ? (
            <p className="text-sm text-ink-soft">Pick a locality on the left to manage its areas.</p>
          ) : (
            <DataTable
              rows={selectedAreas}
              emptyMessage="No areas yet. Add colonies, landmarks, or societies."
              defaultSortKey="name"
              defaultSortDir="asc"
              columns={[
                { key: "name", header: "Name", sortValue: (r) => r.name, render: (r) => <span className="font-semibold">{r.name}</span> },
                {
                  key: "status",
                  header: "Status",
                  sortValue: (r) => (r.is_active ? 0 : 1),
                  render: (r) => (
                    <Badge className={r.is_active ? "bg-green-soft text-green-deep" : "bg-surface text-ink-soft"}>
                      {r.is_active ? "Active" : "Inactive"}
                    </Badge>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  className: "w-24",
                  render: (r) => (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ name: r.name, is_active: r.is_active });
                          setModal({ type: "edit", item: r });
                        }}
                        className="cursor-pointer rounded-[10px] border border-line p-2 hover:bg-surface"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteArea(r)}
                        className="cursor-pointer rounded-[10px] border border-line p-2 text-rose hover:bg-rose-soft"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </section>
      </div>

      {modal.type !== "none" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-[24px] border border-line bg-white p-6 shadow-pop">
            <h2 className="font-display text-lg font-bold">{modal.type === "edit" ? "Edit area" : "New area"}</h2>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Name</span>
              <input
                className="input-box py-3 text-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Shivaji Nagar / Golani Market"
              />
            </label>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="cursor-pointer"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Active
            </label>
            <div className="mt-6 flex gap-3">
              <button type="button" className="btn-secondary flex-1" disabled={saving} onClick={() => setModal({ type: "none" })}>
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={() => void saveArea()}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
