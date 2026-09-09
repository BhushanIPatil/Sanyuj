"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, initials, locationLabel } from "@/lib/format";
import { accountStatusBadge, accountStatusLabel } from "@/lib/status";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";

export type ProviderProfile = {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string | null;
  pincode: string | null;
  locality: string | null;
  area: string | null;
};

export type ProviderRow = {
  id: string;
  owner_id: string;
  name: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  categories: { name: string; slug: string } | null;
  profiles: ProviderProfile | null;
  coverage: string;
  liveNow: boolean;
};

type LiveSession = {
  id: string;
  pincode: string;
  started_at: string;
  ends_at: string;
  is_active: boolean;
  is_deleted: boolean;
};

export function ProviderDetailPanel({
  provider,
  onClose,
}: {
  provider: ProviderRow;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("live_sessions")
        .select("id, pincode, started_at, ends_at, is_active, is_deleted")
        .eq("business_id", provider.id)
        .order("started_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      setLiveSessions((data as LiveSession[]) ?? []);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [provider.id]);

  const liveNow = liveSessions.some((s) => s.is_active && !s.is_deleted);
  const owner = provider.profiles;

  return (
    <SlideOver
      title={provider.name}
      subtitle={
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={accountStatusBadge(provider.is_active, provider.is_deleted)}>
            {accountStatusLabel(provider.is_active, provider.is_deleted)}
          </Badge>
          {liveNow ? (
            <Badge className="bg-teal-soft text-teal">Live now</Badge>
          ) : (
            <Badge className="bg-surface text-ink-soft">Not live</Badge>
          )}
        </div>
      }
      onClose={onClose}
    >
      <div className="flex items-center gap-3 rounded-[16px] border border-line bg-surface/60 p-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-soft text-sm font-bold text-indigo">
          {initials(provider.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{owner?.full_name || "No owner name"}</p>
          <p className="truncate text-xs text-ink-soft">{owner?.email || "No email"}</p>
          <p className="text-xs text-ink-faint">{owner?.phone || "No phone"}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-bold text-ink-soft">Category</dt>
          <dd className="mt-0.5">{provider.categories?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Owner location</dt>
          <dd className="mt-0.5">{locationLabel(owner?.pincode ?? null, owner?.locality ?? null, owner?.area)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-bold text-ink-soft">Service areas</dt>
          <dd className="mt-0.5 text-ink-soft">{provider.coverage || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Listed</dt>
          <dd className="mt-0.5">{formatDateTime(provider.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Live working</dt>
          <dd className="mt-0.5">{liveNow ? "Yes" : "No"}</dd>
        </div>
      </dl>

      {loading ? (
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
      )}
    </SlideOver>
  );
}
