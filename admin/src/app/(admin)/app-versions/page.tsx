"use client";

import { Plus, Pencil, Trash2, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { TablePageSkeleton } from "@/components/ui/Skeleton";

type AppVersion = {
  id: string;
  platform: "android" | "ios";
  latest_version: string;
  minimum_version: string;
  download_url: string;
  release_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  platform: "android" | "ios";
  latest_version: string;
  minimum_version: string;
  download_url: string;
  release_notes: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  platform: "android",
  latest_version: "",
  minimum_version: "",
  download_url: "",
  release_notes: "",
  is_active: false,
};

export default function AppVersionsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<
    { type: "none" } | { type: "create" } | { type: "edit"; item: AppVersion }
  >({ type: "none" });
  const [form, setForm] = useState<FormState>(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("app_versions")
      .select("*")
      .order("platform", { ascending: true })
      .order("updated_at", { ascending: false });
    if (error) showToast(error.message);
    setRows((data as AppVersion[]) ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm(EMPTY);
    setModal({ type: "create" });
  };

  const openEdit = (item: AppVersion) => {
    setForm({
      platform: item.platform,
      latest_version: item.latest_version,
      minimum_version: item.minimum_version,
      download_url: item.download_url ?? "",
      release_notes: item.release_notes ?? "",
      is_active: item.is_active,
    });
    setModal({ type: "edit", item });
  };

  const save = async () => {
    if (!form.latest_version.trim() || !form.minimum_version.trim()) {
      showToast("Latest and minimum versions are required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      platform: form.platform,
      latest_version: form.latest_version.trim(),
      minimum_version: form.minimum_version.trim(),
      download_url: form.download_url.trim(),
      release_notes: form.release_notes.trim() || null,
      is_active: form.is_active,
    };

    try {
      if (form.is_active) {
        await supabase
          .from("app_versions")
          .update({ is_active: false })
          .eq("platform", form.platform)
          .eq("is_active", true);
      }

      if (modal.type === "edit") {
        const { error } = await supabase.from("app_versions").update(payload).eq("id", modal.item.id);
        if (error) throw error;
        showToast("App version updated");
      } else {
        const { error } = await supabase.from("app_versions").insert(payload);
        if (error) throw error;
        showToast("App version created");
      }
      setModal({ type: "none" });
      void load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: AppVersion) => {
    const ok = await confirm({
      title: "Delete version row?",
      message: `Remove ${item.platform} ${item.latest_version}? Mobile will stop using it if it was active.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.from("app_versions").delete().eq("id", item.id);
    if (error) showToast(error.message);
    else {
      showToast("Deleted");
      void load();
    }
  };

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Mobile"
        title="App versions"
        description="Set minimum (force update) and latest versions per store. Only one active row per platform is served to the app."
        action={
          <button type="button" onClick={openCreate} className="btn-secondary inline-flex w-auto items-center gap-2">
            <Plus size={16} />
            New version
          </button>
        }
      />

      <div className="mt-6">
        <DataTable
          rows={rows}
          emptyMessage="No version rows yet."
          columns={[
            {
              key: "platform",
              header: "Platform",
              render: (r) => (
                <span className="inline-flex items-center gap-2 font-semibold capitalize">
                  <Smartphone size={14} className="text-ink-faint" />
                  {r.platform}
                </span>
              ),
            },
            {
              key: "latest",
              header: "Latest",
              render: (r) => <span className="font-mono text-sm">{r.latest_version}</span>,
            },
            {
              key: "minimum",
              header: "Minimum",
              render: (r) => <span className="font-mono text-sm">{r.minimum_version}</span>,
            },
            {
              key: "url",
              header: "Store URL",
              render: (r) =>
                r.download_url ? (
                  <a
                    href={r.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="max-w-[220px] truncate text-xs font-semibold text-blue-deep hover:underline"
                  >
                    {r.download_url}
                  </a>
                ) : (
                  <span className="text-xs text-ink-faint">—</span>
                ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <Badge className={r.is_active ? "bg-green-soft text-green-deep" : "bg-surface text-ink-soft"}>
                  {r.is_active ? "Active" : "Inactive"}
                </Badge>
              ),
            },
            {
              key: "updated",
              header: "Updated",
              render: (r) => <span className="text-xs text-ink-soft">{formatDateTime(r.updated_at)}</span>,
            },
            {
              key: "actions",
              header: "",
              className: "w-24",
              render: (r) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="cursor-pointer rounded-[10px] border border-line p-2 hover:bg-surface"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(r)}
                    className="cursor-pointer rounded-[10px] border border-line p-2 text-rose hover:bg-rose-soft"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {modal.type !== "none" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-[24px] border border-line bg-white p-6 shadow-pop">
            <h2 className="font-display text-lg font-bold">
              {modal.type === "edit" ? "Edit app version" : "New app version"}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Platform</span>
                <select
                  className="input-box cursor-pointer py-3 text-sm"
                  value={form.platform}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, platform: e.target.value as "android" | "ios" }))
                  }
                >
                  <option value="android">Android</option>
                  <option value="ios">iOS</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-ink-soft">Latest version</span>
                  <input
                    className="input-box py-3 text-sm"
                    placeholder="1.0.1"
                    value={form.latest_version}
                    onChange={(e) => setForm((f) => ({ ...f, latest_version: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-ink-soft">Minimum version</span>
                  <input
                    className="input-box py-3 text-sm"
                    placeholder="1.0.0"
                    value={form.minimum_version}
                    onChange={(e) => setForm((f) => ({ ...f, minimum_version: e.target.value }))}
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Download / store URL</span>
                <input
                  className="input-box py-3 text-sm"
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  value={form.download_url}
                  onChange={(e) => setForm((f) => ({ ...f, download_url: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Release notes</span>
                <textarea
                  className="input-box min-h-[96px] py-3 text-sm"
                  placeholder="• Bug fixes&#10;• Performance improvements"
                  value={form.release_notes}
                  onChange={(e) => setForm((f) => ({ ...f, release_notes: e.target.value }))}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Active for this platform
                <span className="font-normal text-ink-faint">(deactivates other rows)</span>
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal({ type: "none" })}>
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
