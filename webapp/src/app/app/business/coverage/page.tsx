"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import { useToast } from "@/components/Toast";
import { EditProfileSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { fetchAreasForLocality } from "@/lib/geo/areas";
import {
  fetchBusinessCoverage,
  savePincodeCoverage,
  type CoverageRow,
  type PreciseCoverageItem,
} from "@/lib/geo/coverage";
import type { PostalLocality } from "@/lib/geo/postal";
import type { AreaOption } from "@/lib/geo/areas";
import { MapPinned } from "lucide-react";

type PinGroup = {
  pincode: string;
  whole: boolean;
  rows: CoverageRow[];
};

function groupCoverage(rows: CoverageRow[]): PinGroup[] {
  const map = new Map<string, CoverageRow[]>();
  for (const row of rows) {
    const list = map.get(row.pincode) ?? [];
    list.push(row);
    map.set(row.pincode, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pincode, list]) => ({
      pincode,
      whole: list.some((r) => !r.locality_id && !r.area_id),
      rows: list,
    }));
}

function summarize(group: PinGroup): string {
  if (group.whole) return "Entire pincode";
  const localityNames = new Set<string>();
  const areaNames: string[] = [];
  for (const row of group.rows) {
    if (row.area_id && row.areas?.name) areaNames.push(row.areas.name);
    else if (row.localities?.name) localityNames.add(`${row.localities.name} (all)`);
  }
  return [...localityNames, ...areaNames].join(", ") || "Selected localities";
}

export default function BusinessCoveragePage() {
  const { showToast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [editingPin, setEditingPin] = useState<string | null>(null);
  const [entire, setEntire] = useState(true);
  const [localities, setLocalities] = useState<PostalLocality[]>([]);
  const [selectedLocalities, setSelectedLocalities] = useState<string[]>([]);
  const [areasByLocality, setAreasByLocality] = useState<Record<string, AreaOption[]>>({});
  const [entireLocalities, setEntireLocalities] = useState<Record<string, boolean>>({});
  const [selectedAreas, setSelectedAreas] = useState<Record<string, string[]>>({});
  const [loadingLocalities, setLoadingLocalities] = useState(false);

  const groups = useMemo(() => groupCoverage(rows), [rows]);

  const load = useCallback(async (id: string) => {
    const supabase = createClient();
    const data = await fetchBusinessCoverage(supabase, id);
    setRows(data);
  }, []);

  useEffect(() => {
    const boot = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: biz } = await visible(supabase.from("businesses").select("id"))
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!biz) {
        setReady(true);
        return;
      }
      setBusinessId(biz.id);
      await load(biz.id);
      setReady(true);
    };
    void boot();
  }, [load]);

  async function openEditor(pincode: string, existing?: PinGroup) {
    setEditingPin(pincode);
    setEntire(existing?.whole ?? true);
    setSelectedLocalities([]);
    setEntireLocalities({});
    setSelectedAreas({});
    setAreasByLocality({});
    setLoadingLocalities(true);
    try {
      const res = await fetch(`/api/geo/pincode/${pincode}`);
      const data = (await res.json()) as { localities?: PostalLocality[] };
      const list = data.localities ?? [];
      setLocalities(list);

      if (existing && !existing.whole) {
        const names: string[] = [];
        const entireMap: Record<string, boolean> = {};
        const areaMap: Record<string, string[]> = {};
        for (const row of existing.rows) {
          const name = row.localities?.name;
          if (!name) continue;
          if (!names.includes(name)) names.push(name);
          if (!row.area_id) entireMap[name] = true;
          else {
            entireMap[name] = entireMap[name] ?? false;
            areaMap[name] = [...(areaMap[name] ?? []), row.area_id];
          }
        }
        setSelectedLocalities(names);
        setEntireLocalities(entireMap);
        setSelectedAreas(areaMap);
        const supabase = createClient();
        const areaEntries: Record<string, AreaOption[]> = {};
        for (const name of names) {
          const loc = list.find((l) => l.name === name);
          if (loc?.id) areaEntries[name] = await fetchAreasForLocality(supabase, loc.id);
        }
        setAreasByLocality(areaEntries);
      }
    } finally {
      setLoadingLocalities(false);
    }
  }

  async function toggleLocality(name: string, on: boolean) {
    setSelectedLocalities((prev) => (on ? [...prev, name] : prev.filter((n) => n !== name)));
    if (!on) {
      setEntireLocalities((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setSelectedAreas((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      return;
    }
    setEntireLocalities((prev) => ({ ...prev, [name]: true }));
    const loc = localities.find((l) => l.name === name);
    if (!loc?.id) return;
    const supabase = createClient();
    const areas = await fetchAreasForLocality(supabase, loc.id);
    setAreasByLocality((prev) => ({ ...prev, [name]: areas }));
  }

  async function saveEditor() {
    if (!businessId || !editingPin) return;
    setSaving(true);
    try {
      const items: PreciseCoverageItem[] = entire
        ? []
        : selectedLocalities.map((name) => ({
            localityName: name,
            entireLocality: entireLocalities[name] !== false || !(selectedAreas[name]?.length),
            areaIds: entireLocalities[name] === false ? (selectedAreas[name] ?? []) : [],
          }));
      if (!entire && !items.length) throw new Error("Select at least one locality, or cover the whole pincode");
      await savePincodeCoverage(createClient(), businessId, editingPin, entire ? "whole" : "precise", items);
      await load(businessId);
      setEditingPin(null);
      setNewPin("");
      showToast("Service area saved");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save coverage");
    } finally {
      setSaving(false);
    }
  }

  async function removePin(pincode: string) {
    if (!businessId) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("business_service_areas")
        .delete()
        .eq("business_id", businessId)
        .eq("pincode", pincode);
      if (error) throw error;
      await load(businessId);
      if (editingPin === pincode) setEditingPin(null);
      showToast("Pincode removed");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not remove pincode");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <EditProfileSkeleton />;

  if (!businessId) {
    return (
      <div className="page-pad max-w-2xl">
        <p className="font-display text-lg font-bold">Service areas</p>
        <p className="mt-3 text-sm text-ink-soft">Create a business profile first.</p>
        <Link href="/app/business/setup" className="btn-primary mt-4 inline-flex w-auto px-5">
          Set up business
        </Link>
      </div>
    );
  }

  return (
    <div className="page-pad max-w-2xl">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/app/business"
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div>
          <h1 className="font-display text-lg font-bold">Service areas</h1>
        </div>
      </header>
      <p className="mb-4 text-[12.5px] leading-relaxed text-ink-soft">
        Cover a whole pincode, selected localities, or specific colonies. Customers only see you when
        their location matches.
      </p>

      <div className="space-y-3">
        {groups.length === 0 ? (
          <EmptyState
            icon={MapPinned}
            title="No service areas yet"
            message="Add a pincode below so nearby customers can find your business."
          />
        ) : (
          groups.map((g) => (
            <div key={g.pincode} className="rounded-[18px] border border-line bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-base font-bold">{g.pincode}</p>
                  <p className="mt-1 text-[12px] text-ink-soft">{summarize(g)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-blue-soft px-3 py-1.5 text-[11px] font-bold text-blue-deep"
                    onClick={() => void openEditor(g.pincode, g)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-line px-3 py-1.5 text-[11px] font-bold text-rose"
                    onClick={() => void removePin(g.pincode)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <label className="mb-2 mt-6 block text-xs font-bold">Add pincode</label>
      <div className="flex gap-2">
        <input
          className="input-box font-mono"
          inputMode="numeric"
          maxLength={6}
          placeholder="425001"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
        <button
          type="button"
          className="btn-secondary w-auto shrink-0 px-4"
          disabled={newPin.length !== 6 || groups.some((g) => g.pincode === newPin)}
          onClick={() => void openEditor(newPin)}
        >
          Add
        </button>
      </div>

      {editingPin ? (
        <div className="mt-6 rounded-[18px] border border-line bg-white p-4 shadow-card">
          <p className="text-sm font-bold">Coverage for {editingPin}</p>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={entire}
              onChange={(e) => setEntire(e.target.checked)}
            />
            Entire pincode
          </label>

          {!entire ? (
            <div className="mt-3">
              {loadingLocalities ? (
                <p className="text-xs text-ink-soft">Loading localities…</p>
              ) : (
                <div className="space-y-3">
                  {localities.map((l) => {
                    const on = selectedLocalities.includes(l.name);
                    const areas = areasByLocality[l.name] ?? [];
                    return (
                      <div key={l.name} className="rounded-[12px] bg-surface p-3">
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                          <input
                            type="checkbox"
                            className="cursor-pointer"
                            checked={on}
                            onChange={(e) => void toggleLocality(l.name, e.target.checked)}
                          />
                          {l.name}
                        </label>
                        {on && areas.length > 0 ? (
                          <div className="mt-2 pl-6">
                            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                              <input
                                type="checkbox"
                                className="cursor-pointer"
                                checked={entireLocalities[l.name] !== false}
                                onChange={(e) =>
                                  setEntireLocalities((prev) => ({ ...prev, [l.name]: e.target.checked }))
                                }
                              />
                              Entire locality
                            </label>
                            {entireLocalities[l.name] === false ? (
                              <div className="mt-2 space-y-1">
                                {areas.map((a) => {
                                  const picked = selectedAreas[l.name]?.includes(a.id) ?? false;
                                  return (
                                    <label key={a.id} className="flex cursor-pointer items-center gap-2 text-xs">
                                      <input
                                        type="checkbox"
                                        className="cursor-pointer"
                                        checked={picked}
                                        onChange={(e) =>
                                          setSelectedAreas((prev) => {
                                            const cur = prev[l.name] ?? [];
                                            return {
                                              ...prev,
                                              [l.name]: e.target.checked
                                                ? [...cur, a.id]
                                                : cur.filter((id) => id !== a.id),
                                            };
                                          })
                                        }
                                      />
                                      {a.name}
                                    </label>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setEditingPin(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={saving}
              onClick={() => void saveEditor()}
            >
              {saving ? "Saving…" : "Save coverage"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
