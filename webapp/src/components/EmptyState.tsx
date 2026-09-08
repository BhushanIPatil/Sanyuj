import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-blue-soft">
        <Icon size={32} className="text-blue-deep" strokeWidth={1.8} />
      </div>
      <h3 className="mt-4 font-display text-base font-extrabold text-ink">{title}</h3>
      {message ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{message}</p>
      ) : null}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 rounded-full bg-blue-deep px-5 py-2.5 text-sm font-bold text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && onAction && !actionHref ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-full bg-blue-deep px-5 py-2.5 text-sm font-bold text-white"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
