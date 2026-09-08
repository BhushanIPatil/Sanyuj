"use client";

import type { ReactNode } from "react";
import { Pencil, Send, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { ImagePreview } from "@/components/ui/ImageOrEmoji";

export type PushNotification = {
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

export function isSent(row: PushNotification) {
  return Boolean(row.sent_datetime);
}

export function notificationStatusBadge(row: PushNotification) {
  return isSent(row) ? "bg-green-soft text-green-deep" : "bg-amber-soft text-amber";
}

export function notificationStatusLabel(row: PushNotification) {
  return isSent(row) ? "Sent" : "Draft";
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export function NotificationDetailPanel({
  item,
  sending,
  onClose,
  onSend,
  onEdit,
  onDelete,
}: {
  item: PushNotification;
  sending: boolean;
  onClose: () => void;
  onSend: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sent = isSent(item);

  return (
    <SlideOver
      title={item.title}
      subtitle={
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={notificationStatusBadge(item)}>{notificationStatusLabel(item)}</Badge>
          {sent ? (
            <Badge className="bg-blue-soft text-blue-deep">
              {item.sent_count.toLocaleString()} device{item.sent_count === 1 ? "" : "s"}
            </Badge>
          ) : null}
        </div>
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm"
            disabled={sending}
            onClick={onEdit}
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            type="button"
            className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm"
            disabled={sending}
            onClick={onSend}
          >
            <Send size={14} />
            {sending ? "Sending…" : sent ? "Send again" : "Send now"}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[18px] border border-rose/30 bg-rose-soft px-3 py-2 text-sm font-bold text-rose disabled:opacity-50"
            disabled={sending}
            onClick={onDelete}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      }
    >
      {item.image ? <ImagePreview src={item.image} alt={item.title} height={180} className="mb-4" /> : null}

      <section>
        <h3 className="mb-1.5 text-sm font-bold">Message</h3>
        <p className="whitespace-pre-wrap rounded-[14px] border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink">
          {item.message_body}
        </p>
      </section>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Detail label="Status" value={notificationStatusLabel(item)} />
        <Detail
          label="Delivered"
          value={sent ? `${item.sent_count.toLocaleString()} devices` : "Not sent yet"}
        />
        <Detail label="Created" value={formatDateTime(item.entry_datetime || item.created_at)} />
        <Detail label="Sent" value={sent ? formatDateTime(item.sent_datetime) : "—"} />
        <Detail label="Sent by" value={item.sent_by?.trim() || "—"} />
        <Detail label="Updated" value={formatDateTime(item.updated_at)} />
      </dl>

      {item.image ? (
        <section className="mt-5">
          <h3 className="mb-1.5 text-sm font-bold">Image URL</h3>
          <p className="break-all text-sm text-blue-deep">{item.image}</p>
        </section>
      ) : null}
    </SlideOver>
  );
}
