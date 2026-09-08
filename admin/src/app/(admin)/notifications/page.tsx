"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, FileText, Pencil, Plus, Send, SlidersHorizontal, Smartphone, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { TablePageSkeleton } from "@/components/ui/Skeleton";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { ImageOrEmoji, ImagePreview } from "@/components/ui/ImageOrEmoji";
import {
  NotificationDetailPanel,
  isSent,
  notificationStatusBadge,
  notificationStatusLabel,
  type PushNotification,
} from "./NotificationDetailPanel";

type FormState = {
  title: string;
  message_body: string;
  image: string;
};

const EMPTY: FormState = {
  title: "",
  message_body: "",
  image: "",
};

const EMPTY_FILTERS = {
  search: "",
  status: "all",
  image: "all",
};

function webappBaseUrl() {
  return (process.env.NEXT_PUBLIC_WEBAPP_URL ?? "").replace(/\/$/, "");
}

export default function NotificationsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<PushNotification[]>([]);
  const [activeDevices, setActiveDevices] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [modal, setModal] = useState<"none" | "create" | "edit">("none");
  const [editing, setEditing] = useState<PushNotification | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [imageFilter, setImageFilter] = useState("all");
  const [selected, setSelected] = useState<PushNotification | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [notesRes, devicesRes] = await Promise.all([
      supabase.from("push_notifications").select("*").order("entry_datetime", { ascending: false }),
      supabase.from("device_tokens").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);
    if (notesRes.error) showToast(notesRes.error.message);
    const list = (notesRes.data as PushNotification[]) ?? [];
    setRows(list);
    setActiveDevices(devicesRes.count ?? 0);
    setSelected((cur) => (cur ? (list.find((r) => r.id === cur.id) ?? null) : null));
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeFilterCount = [
    search.trim() ? 1 : 0,
    status !== "all" ? 1 : 0,
    imageFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setSearch(EMPTY_FILTERS.search);
    setStatus(EMPTY_FILTERS.status);
    setImageFilter(EMPTY_FILTERS.image);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "sent" && !isSent(r)) return false;
      if (status === "draft" && isSent(r)) return false;
      if (imageFilter === "with" && !r.image?.trim()) return false;
      if (imageFilter === "none" && r.image?.trim()) return false;
      if (q) {
        const hay = `${r.title} ${r.message_body} ${r.sent_by ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, status, imageFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const sent = rows.filter(isSent).length;
    const drafts = total - sent;
    const delivered = rows.reduce((sum, r) => sum + (r.sent_count ?? 0), 0);
    return { total, sent, drafts, delivered };
  }, [rows]);

  const closePanel = useCallback(() => setSelected(null), []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModal("create");
  };

  const openEdit = (item: PushNotification) => {
    setEditing(item);
    setForm({
      title: item.title,
      message_body: item.message_body,
      image: item.image ?? "",
    });
    setModal("edit");
  };

  const closeModal = () => {
    setModal("none");
    setEditing(null);
  };

  const save = async () => {
    if (!form.title.trim() || !form.message_body.trim()) {
      showToast("Title and message are required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      title: form.title.trim(),
      message_body: form.message_body.trim(),
      image: form.image.trim() || null,
    };
    try {
      if (modal === "edit" && editing) {
        const { error } = await supabase.from("push_notifications").update(payload).eq("id", editing.id);
        if (error) throw error;
        showToast("Notification updated");
      } else {
        const { error } = await supabase.from("push_notifications").insert({
          ...payload,
          entry_datetime: new Date().toISOString(),
        });
        if (error) throw error;
        showToast("Notification created");
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const send = async (item: PushNotification) => {
    const base = webappBaseUrl();
    if (!base) {
      showToast("Set NEXT_PUBLIC_WEBAPP_URL in admin .env (webapp origin)");
      return;
    }

    const ok = await confirm({
      title: item.sent_datetime ? "Send again?" : "Send notification?",
      message: `Push “${item.title}” to all active devices now.`,
      confirmLabel: "Send now",
      tone: "default",
    });
    if (!ok) return;

    setSendingId(item.id);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        showToast("Not signed in");
        return;
      }

      const res = await fetch(`${base}/api/notifications/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ notificationId: item.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        successCount?: number;
        failureCount?: number;
      };
      if (!res.ok) {
        throw new Error(data.error || "Send failed");
      }
      showToast(
        `Sent to ${data.successCount ?? 0} device(s)` +
          (data.failureCount ? ` (${data.failureCount} failed)` : ""),
      );
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSendingId(null);
    }
  };

  const remove = async (item: PushNotification) => {
    const ok = await confirm({
      title: "Delete notification?",
      message: `Remove “${item.title}”? This does not recall already-delivered pushes.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.from("push_notifications").delete().eq("id", item.id);
    if (error) {
      showToast(error.message);
      return;
    }
    showToast("Deleted");
    setSelected(null);
    await load();
  };

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        title="Notifications management"
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={openCreate} className="btn-secondary inline-flex w-auto items-center gap-2 py-2.5">
              <Plus size={16} />
              New notification
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
              <FilterInput value={search} onChange={setSearch} placeholder="Title, message, or sender" />
            </FilterField>
            <FilterField label="Status">
              <FilterSelect value={status} onChange={setStatus}>
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              </FilterSelect>
            </FilterField>
            <FilterField label="Image">
              <FilterSelect value={imageFilter} onChange={setImageFilter}>
                <option value="all">All</option>
                <option value="with">With image</option>
                <option value="none">No image</option>
              </FilterSelect>
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
        <StatCard label="Total" value={stats.total} hint={`${stats.drafts} drafts`} icon={Bell} tone="blue" />
        <StatCard label="Sent" value={stats.sent} icon={Send} tone="green" />
        <StatCard
          label="Delivered"
          value={stats.delivered.toLocaleString()}
          hint="Successful device sends"
          icon={FileText}
          tone="indigo"
        />
        <StatCard
          label="Active devices"
          value={activeDevices.toLocaleString()}
          hint="Registered for push"
          icon={Smartphone}
          tone="teal"
        />
      </div>

      <div className="mt-4">
        <DataTable
          rows={filtered}
          selectedId={selected?.id}
          emptyMessage="No notifications match your filters."
          onRowClick={setSelected}
          defaultSortKey="created"
          defaultSortDir="desc"
          columns={[
            {
              key: "image",
              header: "Image",
              className: "w-16",
              sortable: false,
              render: (r) => <ImageOrEmoji value={r.image} alt={r.title} size={40} />,
            },
            {
              key: "title",
              header: "Notification",
              sortValue: (r) => r.title,
              render: (r) => (
                <div className="max-w-[280px]">
                  <p className="font-semibold">{r.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{r.message_body}</p>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              sortValue: (r) => (isSent(r) ? 1 : 0),
              render: (r) => <Badge className={notificationStatusBadge(r)}>{notificationStatusLabel(r)}</Badge>,
            },
            {
              key: "sent",
              header: "Delivered",
              sortValue: (r) => r.sent_count ?? 0,
              render: (r) =>
                isSent(r) ? (
                  <div className="text-xs text-ink-soft">
                    <p className="font-semibold text-ink">{r.sent_count.toLocaleString()} devices</p>
                    <p>{formatDateTime(r.sent_datetime)}</p>
                    {r.sent_by ? <p className="text-ink-faint">by {r.sent_by}</p> : null}
                  </div>
                ) : (
                  <span className="text-xs text-ink-faint">—</span>
                ),
            },
            {
              key: "created",
              header: "Created",
              sortValue: (r) => r.entry_datetime,
              render: (r) => <span className="text-xs text-ink-soft">{formatDateTime(r.entry_datetime)}</span>,
            },
            {
              key: "actions",
              header: "Actions",
              className: "w-36",
              render: (r) => (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => openEdit(r)}
                    className="rounded-[10px] border border-line p-2 hover:bg-surface"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    title="Send now"
                    disabled={sendingId === r.id}
                    onClick={() => void send(r)}
                    className="rounded-[10px] border border-line p-2 text-blue-deep hover:bg-blue-soft disabled:opacity-50"
                  >
                    <Send size={14} />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => void remove(r)}
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
        <NotificationDetailPanel
          key={selected.id}
          item={selected}
          sending={sendingId === selected.id}
          onClose={closePanel}
          onSend={() => void send(selected)}
          onEdit={() => openEdit(selected)}
          onDelete={() => void remove(selected)}
        />
      ) : null}

      {modal !== "none" ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-[24px] border border-line bg-white p-6 shadow-pop">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Bell size={18} />
              {modal === "edit" ? "Edit notification" : "New push notification"}
            </h2>
            {modal === "edit" && editing && isSent(editing) ? (
              <p className="mt-1 text-sm text-ink-soft">
                Already delivered pushes are not changed. Send again to use this copy.
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Title</span>
                <input
                  className="input-box py-3 text-sm"
                  placeholder="Something new in your area"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Message</span>
                <textarea
                  className="input-box min-h-[112px] py-3 text-sm"
                  placeholder="Short body shown on the lock screen"
                  value={form.message_body}
                  onChange={(e) => setForm((f) => ({ ...f, message_body: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Image URL (optional)</span>
                <input
                  className="input-box py-3 text-sm"
                  placeholder="https://… (public HTTPS, under 1MB)"
                  value={form.image}
                  onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                />
                <span className="mt-1 block text-[11px] text-ink-faint">
                  Must be a direct HTTPS image link (JPG/PNG). Hotlink-protected URLs will not show.
                </span>
                <ImagePreview src={form.image} alt={form.title} className="mt-3" height={140} />
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : modal === "edit" ? "Update" : "Save draft"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
