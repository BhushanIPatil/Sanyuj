"use client";

import { Bell, Plus, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { TablePageSkeleton } from "@/components/ui/Skeleton";

type PushNotification = {
  id: string;
  title: string;
  message_body: string;
  image: string | null;
  entry_datetime: string;
  sent_datetime: string | null;
  sent_count: number;
  sent_by: string | null;
  created_at: string;
  updated_at: string;
};

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

function webappBaseUrl() {
  return (process.env.NEXT_PUBLIC_WEBAPP_URL ?? "").replace(/\/$/, "");
}

export default function NotificationsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [modal, setModal] = useState<"none" | "create">("none");
  const [form, setForm] = useState<FormState>(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("push_notifications")
      .select("*")
      .order("entry_datetime", { ascending: false });
    if (error) showToast(error.message);
    setRows((data as PushNotification[]) ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm(EMPTY);
    setModal("create");
  };

  const save = async () => {
    if (!form.title.trim() || !form.message_body.trim()) {
      showToast("Title and message are required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.from("push_notifications").insert({
        title: form.title.trim(),
        message_body: form.message_body.trim(),
        image: form.image.trim() || null,
        entry_datetime: new Date().toISOString(),
      });
      if (error) throw error;
      showToast("Notification created");
      setModal("none");
      void load();
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
      void load();
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
        eyebrow="Engagement"
        title="Push notifications"
        description="Create a message, then send it immediately to all registered devices. Event-based pushes (jobs, interests, deals) can reuse the same sender later."
        action={
          <button type="button" onClick={openCreate} className="btn-secondary inline-flex w-auto items-center gap-2">
            <Plus size={16} />
            New notification
          </button>
        }
      />

      <div className="mt-6">
        <DataTable
          rows={rows}
          emptyMessage="No notifications yet."
          columns={[
            {
              key: "title",
              header: "Title",
              render: (r) => (
                <div className="max-w-[240px]">
                  <p className="font-semibold">{r.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{r.message_body}</p>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) =>
                r.sent_datetime ? (
                  <Badge className="bg-green-soft text-green-deep">Sent</Badge>
                ) : (
                  <Badge className="bg-surface text-ink-soft">Draft</Badge>
                ),
            },
            {
              key: "sent",
              header: "Delivered",
              render: (r) =>
                r.sent_datetime ? (
                  <div className="text-xs text-ink-soft">
                    <p className="font-semibold text-ink">{r.sent_count} devices</p>
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
              render: (r) => <span className="text-xs text-ink-soft">{formatDateTime(r.entry_datetime)}</span>,
            },
            {
              key: "actions",
              header: "",
              className: "w-36",
              render: (r) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    title="Send now"
                    disabled={sendingId === r.id}
                    onClick={() => void send(r)}
                    className="cursor-pointer rounded-[10px] border border-line p-2 text-blue-deep hover:bg-blue-soft disabled:opacity-50"
                  >
                    <Send size={14} />
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

      {modal === "create" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-[24px] border border-line bg-white p-6 shadow-pop">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Bell size={18} />
              New push notification
            </h2>
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
                  placeholder="https://…"
                  value={form.image}
                  onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                />
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal("none")}>
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save draft"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
