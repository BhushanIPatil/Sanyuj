"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, initials, locationLabel } from "@/lib/format";
import { accountStatusBadge, accountStatusLabel } from "@/lib/status";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import { KeyRound, Pencil, RotateCcw, Trash2 } from "lucide-react";

export type UserBusiness = {
  id: string;
  owner_id: string;
  name: string;
  rating: number;
  is_active: boolean;
  is_deleted: boolean;
  categories: { name: string } | null;
};

export type UserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  pincode: string | null;
  locality: string | null;
  area: string | null;
  address: string | null;
  onboarding_complete: boolean;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  business: UserBusiness | null;
};

type LiveSession = {
  id: string;
  pincode: string;
  started_at: string;
  ends_at: string;
  is_active: boolean;
  is_deleted: boolean;
};

export function UserDetailPanel({
  user,
  onClose,
  onEdit,
  onPassword,
  onDelete,
  onRestore,
}: {
  user: UserRow;
  onClose: () => void;
  onEdit: () => void;
  onPassword: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [liveNow, setLiveNow] = useState(false);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      if (!user.business) {
        if (!cancelled) {
          setLiveNow(false);
          setLiveSessions([]);
          setLoading(false);
        }
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("live_sessions")
        .select("id, pincode, started_at, ends_at, is_active, is_deleted")
        .eq("business_id", user.business.id)
        .order("started_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      const sessions = (data as LiveSession[] | null) ?? [];
      setLiveSessions(sessions);
      setLiveNow(sessions.some((s) => s.is_active && !s.is_deleted));
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user.id, user.business?.id]);

  return (
    <SlideOver
      title={user.full_name || "Unnamed user"}
      subtitle={
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            className={
              user.business ? "bg-indigo-soft text-indigo" : "bg-surface text-ink-soft"
            }
          >
            {user.business ? "Provider" : "Customer"}
          </Badge>
          <Badge className={accountStatusBadge(user.is_active, user.is_deleted)}>
            {accountStatusLabel(user.is_active, user.is_deleted)}
          </Badge>
          {liveNow ? <Badge className="bg-teal-soft text-teal">Live now</Badge> : null}
        </div>
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm" onClick={onEdit}>
            <Pencil size={14} />
            Edit
          </button>
          <button type="button" className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm" onClick={onPassword}>
            <KeyRound size={14} />
            Password
          </button>
          {user.is_deleted ? (
            <button type="button" className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm" onClick={onRestore}>
              <RotateCcw size={14} />
              Restore
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-[18px] border border-rose/30 bg-rose-soft px-3 py-2 text-sm font-bold text-rose"
              onClick={onDelete}
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-3 rounded-[16px] border border-line bg-surface/60 p-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-soft text-sm font-bold text-blue-deep">
          {initials(user.full_name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.email || "No email"}</p>
          <p className="text-xs text-ink-soft">{user.phone || "No phone"}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-bold text-ink-soft">Location</dt>
          <dd className="mt-0.5">{locationLabel(user.pincode, user.locality, user.area)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Onboarded</dt>
          <dd className="mt-0.5">{user.onboarding_complete ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Joined</dt>
          <dd className="mt-0.5">{formatDateTime(user.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Updated</dt>
          <dd className="mt-0.5">{formatDateTime(user.updated_at)}</dd>
        </div>
        {user.address ? (
          <div className="col-span-2">
            <dt className="text-xs font-bold text-ink-soft">Address</dt>
            <dd className="mt-0.5">{user.address}</dd>
          </div>
        ) : null}
      </dl>

      {user.business ? (
        <section className="mt-5 rounded-[16px] border border-line p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Business</p>
          <p className="mt-1 font-semibold">{user.business.name}</p>
          <p className="text-xs text-ink-soft">
            {user.business.categories?.name ?? "—"} · {Number(user.business.rating).toFixed(1)}★
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            Business {accountStatusLabel(user.business.is_active, user.business.is_deleted)}
          </p>
        </section>
      ) : null}

      {user.business ? (
        loading ? (
          <div className="mt-5 space-y-3">
            <SkeletonLine width="7rem" className="h-4" />
            <Skeleton className="h-24 w-full rounded-[16px]" />
          </div>
        ) : (
          <section className="mt-5 pb-4">
            <h3 className="mb-2 text-sm font-bold">Live sessions</h3>
            {liveSessions.length === 0 ? (
              <p className="py-3 text-sm text-ink-faint">This provider has not gone live yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-[16px] border border-line">
                {liveSessions.map((session) => {
                  const active = session.is_active && !session.is_deleted;
                  return (
                    <li key={session.id} className="flex items-start justify-between gap-3 px-3 py-3">
                      <div>
                        <p className="font-semibold">{active ? "Live now" : "Ended"}</p>
                        <p className="mt-0.5 text-xs text-ink-soft">Pincode {session.pincode}</p>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {formatDateTime(session.started_at)} → {formatDateTime(session.ends_at)}
                        </p>
                      </div>
                      <Badge className={active ? "bg-teal-soft text-teal" : "bg-surface text-ink-soft"}>
                        {active ? "Live" : "Ended"}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )
      ) : null}
    </SlideOver>
  );
}
