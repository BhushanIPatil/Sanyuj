"use client";

import { Plus, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ImageOrEmoji, ImagePreview } from "@/components/ui/ImageOrEmoji";
import { AdsPageSkeleton } from "@/components/ui/Skeleton";

type Ad = {
  id: string;
  brand_name: string;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  background: string;
  sort_order: number;
  is_active: boolean;
  is_deleted: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

const EMPTY_AD: Omit<Ad, "id" | "created_at"> = {
  brand_name: "",
  title: "",
  body: "",
  cta_label: "",
  cta_url: "",
  image_url: "",
  background: "linear-gradient(135deg,#2E86D6,#3B5BDB)",
  sort_order: 0,
  is_active: true,
  is_deleted: false,
  starts_at: null,
  ends_at: null,
};

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_AD);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("ads")
      .select("*")
      .order("sort_order", { ascending: true });
    setRows((data as Ad[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_AD);
    setCreating(true);
  };

  const openEdit = (ad: Ad) => {
    setCreating(false);
    setEditing(ad);
    setForm({
      brand_name: ad.brand_name,
      title: ad.title,
      body: ad.body ?? "",
      cta_label: ad.cta_label ?? "",
      cta_url: ad.cta_url ?? "",
      image_url: ad.image_url ?? "",
      background: ad.background,
      sort_order: ad.sort_order,
      is_active: ad.is_active,
      is_deleted: ad.is_deleted,
      starts_at: ad.starts_at,
      ends_at: ad.ends_at,
    });
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (!form.brand_name.trim() || !form.title.trim()) {
      showToast("Brand name and title are required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      brand_name: form.brand_name.trim(),
      title: form.title.trim(),
      body: form.body?.trim() || null,
      cta_label: form.cta_label?.trim() || null,
      cta_url: form.cta_url?.trim() || null,
      image_url: form.image_url?.trim() || null,
      background: form.background.trim() || EMPTY_AD.background,
      sort_order: form.sort_order,
      is_active: form.is_active,
      is_deleted: form.is_deleted,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };

    if (editing) {
      const { error } = await supabase.from("ads").update(payload).eq("id", editing.id);
      if (error) showToast(error.message);
      else {
        showToast("Ad updated");
        closeModal();
        void load();
      }
    } else {
      const { error } = await supabase.from("ads").insert(payload);
      if (error) showToast(error.message);
      else {
        showToast("Ad created");
        closeModal();
        void load();
      }
    }
    setSaving(false);
  };

  const remove = async (ad: Ad) => {
    const ok = await confirm({
      title: "Delete ad?",
      message: `This will permanently remove "${ad.title}". This action cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    const supabase = createClient();
    const { error } = await supabase.from("ads").delete().eq("id", ad.id);
    if (error) showToast(error.message);
    else {
      showToast("Ad deleted");
      void load();
    }
  };

  const modalOpen = creating || !!editing;

  if (loading) return <AdsPageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Marketing"
        title="Ads"
        description="Manage home page brand banners and sponsored campaigns."
        action={
          <button type="button" onClick={openCreate} className="btn-secondary inline-flex w-auto items-center gap-2">
            <Plus size={16} />
            New ad
          </button>
        }
      />

      <div className="mt-4">
        <DataTable
          rows={rows}
          emptyMessage="No ads yet. Create your first campaign."
          columns={[
            {
              key: "image",
              header: "Image",
              className: "w-16",
              render: (row) => (
                <ImageOrEmoji value={row.image_url} alt={row.brand_name} size={40} />
              ),
            },
            {
              key: "brand",
              header: "Brand",
              render: (row) => (
                <div>
                  <p className="font-semibold">{row.brand_name}</p>
                  <p className="text-xs text-ink-soft">{row.title}</p>
                </div>
              ),
            },
            {
              key: "order",
              header: "Order",
              render: (row) => <span>{row.sort_order}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <Badge
                  className={
                    row.is_active && !row.is_deleted
                      ? "bg-green-soft text-green-deep"
                      : "bg-surface text-ink-soft"
                  }
                >
                  {row.is_deleted ? "Deleted" : row.is_active ? "Active" : "Inactive"}
                </Badge>
              ),
            },
            {
              key: "schedule",
              header: "Schedule",
              render: (row) => (
                <span className="text-xs text-ink-soft">
                  {row.starts_at ? formatDateTime(row.starts_at) : "Anytime"}
                  {" → "}
                  {row.ends_at ? formatDateTime(row.ends_at) : "No end"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              className: "w-24",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="cursor-pointer rounded-[10px] border border-line p-2 hover:bg-surface"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(row)}
                    className="cursor-pointer rounded-[10px] border border-line p-2 text-rose hover:bg-rose-soft"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-line bg-white shadow-pop">
            <div className="border-b border-line px-6 py-5">
              <h2 className="font-display text-xl font-bold">
                {editing ? "Edit ad" : "New ad"}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Fill in the campaign details and preview how it will look.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  {[
                    ["brand_name", "Brand name"],
                    ["title", "Title"],
                    ["body", "Body"],
                    ["cta_label", "CTA label"],
                    ["cta_url", "CTA URL"],
                    ["background", "Background (CSS)"],
                  ].map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="mb-1 block text-xs font-bold text-ink-soft">{label}</span>
                      <input
                        className="input-box py-3 text-sm"
                        value={String(form[key as keyof typeof form] ?? "")}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      />
                    </label>
                  ))}

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-ink-soft">Image URL</span>
                    <input
                      className="input-box py-3 text-sm"
                      value={form.image_url ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                      placeholder="https://..."
                    />
                    <ImagePreview src={form.image_url} alt={form.brand_name} className="mt-3" height={180} />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-ink-soft">Sort order</span>
                    <input
                      type="number"
                      className="input-box py-3 text-sm"
                      value={form.sort_order}
                      onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-ink-soft">Starts at</span>
                      <input
                        type="datetime-local"
                        className="input-box py-3 text-sm"
                        value={toDatetimeLocal(form.starts_at)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-ink-soft">Ends at</span>
                      <input
                        type="datetime-local"
                        className="input-box py-3 text-sm"
                        value={toDatetimeLocal(form.ends_at)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    />
                    Active
                  </label>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-bold text-ink-soft">Live preview</p>
                  <div
                    className="overflow-hidden rounded-[24px] border border-line shadow-card"
                    style={{ background: form.background || EMPTY_AD.background }}
                  >
                    {form.image_url ? (
                      <ImagePreview src={form.image_url} alt={form.brand_name} height={200} className="rounded-none border-0" />
                    ) : null}
                    <div className="p-6 text-white">
                      <p className="text-xs font-bold uppercase tracking-wide opacity-80">
                        {form.brand_name || "Brand name"}
                      </p>
                      <h3 className="mt-2 font-display text-2xl font-extrabold">
                        {form.title || "Ad title"}
                      </h3>
                      {form.body ? (
                        <p className="mt-2 text-sm leading-relaxed opacity-90">{form.body}</p>
                      ) : null}
                      {form.cta_label ? (
                        <span className="mt-4 inline-flex rounded-full bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur">
                          {form.cta_label}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-line px-6 py-4">
              <button type="button" className="btn-secondary flex-1" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
