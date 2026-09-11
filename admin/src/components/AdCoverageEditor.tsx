"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAreasForLocality, type AreaOption } from "@/lib/geo/areas";
import { summarizeAdPin, type AdPinDraft, type PreciseCoverageItem } from "@/lib/geo/adCoverage";
import type { PostalLocality } from "@/lib/geo/postal";

type Props = {
  nationwide: boolean;
  hideNationwide?: boolean;
  pins: AdPinDraft[];
  onNationwideChange: (nationwide: boolean) => void;
  onPinsChange: (pins: AdPinDraft[]) => void;
};

export function AdCoverageEditor({ nationwide, pins, onNationwideChange, onPinsChange, hideNationwide = false }: Props) {
  const [newPin, setNewPin] = useState("");
  const [editingPin, setEditingPin] = useState<string | null>(null);
  const [entire, setEntire] = useState(true);
  const [localities, setLocalities] = useState<PostalLocality[]>([]);
  const [selectedLocalities, setSelectedLocalities] = useState<string[]>([]);
  const [areasByLocality, setAreasByLocality] = useState<Record<string, AreaOption[]>>({});
  const [entireLocalities, setEntireLocalities] = useState<Record<string, boolean>>({});
  const [selectedAreas, setSelectedAreas] = useState<Record<string, string[]>>({});
  const [loadingLocalities, setLoadingLocalities] = useState(false);
  const [error, setError] = useState("");

  async function openEditor(pincode: string, existing?: AdPinDraft) {
    setError("");
    setEditingPin(pincode);
    setEntire(existing?.whole ?? true);
    setSelectedLocalities(existing?.items.map((i) => i.localityName) ?? []);
    setEntireLocalities(
      Object.fromEntries((existing?.items ?? []).map((i) => [i.localityName, i.entireLocality])),
    );
    setSelectedAreas(
      Object.fromEntries((existing?.items ?? []).map((i) => [i.localityName, i.areaIds])),
    );
    setAreasByLocality({});
    setLoadingLocalities(true);
    try {
      const res = await fetch(`/api/geo/pincode/${pincode}`);
      const data = (await res.json()) as { localities?: PostalLocality[]; error?: string };
      const list = data.localities ?? [];
      if (!res.ok && !list.length) throw new Error(data.error ?? "Could not load localities");
      setLocalities(list);
      const supabase = createClient();
      const areaEntries: Record<string, AreaOption[]> = {};
      for (const name of existing?.items.map((i) => i.localityName) ?? []) {
        const loc = list.find((l) => l.name === name);
        if (loc?.id) areaEntries[name] = await fetchAreasForLocality(supabase, loc.id);
      }
      setAreasByLocality(areaEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load localities");
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
    const areas = await fetchAreasForLocality(createClient(), loc.id);
    setAreasByLocality((prev) => ({ ...prev, [name]: areas }));
  }

  function saveEditor() {
    if (!editingPin) return;
    const items: PreciseCoverageItem[] = entire
      ? []
      : selectedLocalities.map((name) => ({
          localityName: name,
          entireLocality: entireLocalities[name] !== false || !(selectedAreas[name]?.length),
          areaIds: entireLocalities[name] === false ? (selectedAreas[name] ?? []) : [],
        }));
    if (!entire && !items.length) {
      setError("Select at least one locality, or cover the whole pincode");
      return;
    }
    const next: AdPinDraft = { pincode: editingPin, whole: entire, items };
    onPinsChange([...pins.filter((p) => p.pincode !== editingPin), next].sort((a, b) => a.pincode.localeCompare(b.pincode)));
    setEditingPin(null);
    setNewPin("");
    setError("");
  }

  return (
    <div className="space-y-3">
      {!hideNationwide && <label className="flex cursor-pointer items-start gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          className="mt-0.5 cursor-pointer"
          checked={nationwide}
          onChange={(e) => {
            onNationwideChange(e.target.checked);
            if (e.target.checked) setEditingPin(null);
          }}
        />
        <span>
          Show everywhere
          <span className="mt-0.5 block text-xs font-medium text-ink-soft">
            Uncheck to target pincode, locality, or area — choose where this content appears.
          </span>
        </span>
      </label>}

      {!nationwide ? (
        <>
          {pins.length === 0 ? (
            <p className="rounded-[12px] border border-dashed border-line p-3 text-xs text-ink-soft">
              No targeting yet. Add a pincode below.
            </p>
          ) : (
            <div className="space-y-2">
              {pins.map((pin) => (
                <div key={pin.pincode} className="flex items-start justify-between gap-3 rounded-[12px] border border-line bg-surface px-3 py-2.5">
                  <div>
                    <p className="font-mono text-sm font-bold">{pin.pincode}</p>
                    <p className="text-[11px] text-ink-soft">{summarizeAdPin(pin)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-blue-soft px-2.5 py-1 text-[11px] font-bold text-blue-deep"
                      onClick={() => void openEditor(pin.pincode, pin)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-line px-2.5 py-1 text-[11px] font-bold text-rose"
                      onClick={() => {
                        onPinsChange(pins.filter((p) => p.pincode !== pin.pincode));
                        if (editingPin === pin.pincode) setEditingPin(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              className="input-box py-2.5 font-mono text-sm"
              inputMode="numeric"
              maxLength={6}
              placeholder="Add pincode"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button
              type="button"
              className="btn-secondary w-auto shrink-0 px-4"
              disabled={newPin.length !== 6 || pins.some((p) => p.pincode === newPin)}
              onClick={() => void openEditor(newPin)}
            >
              Add
            </button>
          </div>

          {error ? <p className="text-xs font-semibold text-rose">{error}</p> : null}

          {editingPin ? (
            <div className="rounded-[12px] border border-line bg-white p-3">
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
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                  {loadingLocalities ? (
                    <p className="text-xs text-ink-soft">Loading localities…</p>
                  ) : (
                    localities.map((l) => {
                      const on = selectedLocalities.includes(l.name);
                      const areas = areasByLocality[l.name] ?? [];
                      return (
                        <div key={l.name} className="rounded-[10px] bg-surface p-2.5">
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
                                <div className="mt-1.5 space-y-1">
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
                    })
                  )}
                </div>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setEditingPin(null)}>
                  Cancel
                </button>
                <button type="button" className="btn-primary flex-1" onClick={saveEditor}>
                  Save pincode
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
