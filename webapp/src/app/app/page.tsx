"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HomeAds } from "@/components/HomeAds";
import { NoticeCard } from "@/components/NoticeCard";
import { NoticeDetailSheet } from "@/components/NoticeDetailSheet";
import { fetchVisibleNotices, type NoticeDetail } from "@/lib/geo/notices";
import { createClient } from "@/lib/supabase/client";
import { useFilters } from "@/components/filters";

export default function HomePage() {
  const filters = useFilters("featured");
  const { pincode, localityId, areaId } = filters.state.geo;
  const [notices, setNotices] = useState<NoticeDetail[]>([]);
  const [detail, setDetail] = useState<NoticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    // Reset request status when the selected location changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(false);
    const db = createClient();
    const geo = { pincode: pincode || null, localityId, areaId: areaId || null };
    void fetchVisibleNotices(db, geo)
      .then((n) => { if (!cancelled) { setNotices(n.slice(0, 2)); } })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pincode, localityId, areaId, retry]);
  return <div className="page-pad">
    <HomeAds pincode={pincode || null} localityId={localityId} areaId={areaId || null} />
    {error ? <p role="alert" className="mt-6 text-sm text-ink-soft">Could not load local results. <button className="font-bold text-blue-deep" onClick={() => setRetry(v => v + 1)}>Retry</button></p> : null}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-extrabold">Notifications</h2><Link href="/app/notifications" className="text-sm font-bold text-blue-deep">See all</Link></div>
        {loading ? <p className="text-sm text-ink-soft">Loading…</p> : error ? null : notices.length ? <div className="grid gap-4 sm:grid-cols-2">{notices.map(item => <NoticeCard key={item.id} notice={item} onOpen={setDetail} />)}</div> : <p className="text-sm text-ink-soft">No notifications nearby yet.</p>}
      </section>
    <NoticeDetailSheet notice={detail} open={detail !== null} onClose={() => setDetail(null)} />
  </div>;
}
