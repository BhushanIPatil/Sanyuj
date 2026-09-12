"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HomeAds } from "@/components/HomeAds";
import { NoticeCard } from "@/components/NoticeCard";
import { NoticeDetailSheet } from "@/components/NoticeDetailSheet";
import { fetchVisibleNotices, type NoticeDetail } from "@/lib/geo/notices";
import { createClient } from "@/lib/supabase/client";
import { useUserLocation } from "@/components/UserLocation";
import { FilterPanel, useFilters } from "@/components/filters";

export default function HomePage() {
  const { address, refresh } = useUserLocation();
  const filters = useFilters("featured");
  const { pincode, localityId, areaId } = filters.state.geo;
  const [notices, setNotices] = useState<NoticeDetail[]>([]);
  const [services, setServices] = useState<NoticeDetail[]>([]);
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
    void Promise.all([fetchVisibleNotices(db, geo), fetchVisibleNotices(db, { ...geo, kind: "service" })])
      .then(([n, s]) => { if (!cancelled) { setNotices(n.slice(0, 2)); setServices(s.slice(0, 2)); } })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pincode, localityId, areaId, retry]);
  return <div className="page-pad">
    <div className="flex items-center justify-between gap-3">
      <div><h1 className="font-display text-[19px] font-bold">Hi there</h1><p className="mt-1 text-xs text-ink-soft">{address || "Choose your area to see nearby results"}</p></div>
      <button type="button" className="text-sm font-bold text-blue-deep" onClick={() => void refresh()}>Refresh location</button>
    </div>
    <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-blue-deep">Change area</summary>
      <FilterPanel groups={[]} state={filters.state} defaultGeo={filters.defaultGeo} onToggle={filters.toggle} onGeoChange={filters.setGeo} onClear={filters.clear} />
    </details>
    <HomeAds pincode={pincode || null} localityId={localityId} areaId={areaId || null} />
    {error ? <p role="alert" className="mt-6 text-sm text-ink-soft">Could not load local results. <button className="font-bold text-blue-deep" onClick={() => setRetry(v => v + 1)}>Retry</button></p> : null}
    {([{ title: "Notifications", href: "/app/notifications", items: notices }, { title: "Services", href: "/app/services", items: services }]).map(section =>
      <section key={section.href} className="mt-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-extrabold">{section.title}</h2><Link href={section.href} className="text-sm font-bold text-blue-deep">See all</Link></div>
        {loading ? <p className="text-sm text-ink-soft">Loading…</p> : error ? null : section.items.length ? <div className="grid gap-4 sm:grid-cols-2">{section.items.map(item => <NoticeCard key={item.id} notice={item} onOpen={setDetail} />)}</div> : <p className="text-sm text-ink-soft">No {section.title.toLowerCase()} nearby yet.</p>}
      </section>)}
    <NoticeDetailSheet notice={detail} open={detail !== null} onClose={() => setDetail(null)} />
  </div>;
}
