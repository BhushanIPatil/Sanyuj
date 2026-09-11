"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
const cards = [["ads", "Offerly", "/ads"], ["notices", "Notifications", "/notices"], ["push_notifications", "Push campaigns", "/notifications"]] as const;
export default function DashboardPage() {
  const [counts, setCounts] = useState<number[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const db = createClient();
    void Promise.all(cards.map(([table]) => {
      const query = db.from(table).select("id", { count: "exact", head: true });
      return table === "push_notifications" ? query : query.eq("is_deleted", false);
    })).then(results => {
      if (results.some(r => r.error))
        setError("Could not load dashboard. Please refresh.");
      else
        setCounts(results.map(r => r.count ?? 0));
    });
  }, []);
  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-ink-soft">Manage offers and notifications.</p>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-3">{cards.map(([table, label, href], i) => <Link key={table} href={href} className="rounded-2xl border border-line bg-white p-6">
      <h2 className="font-semibold">{label}</h2>
      <p className="mt-3 text-3xl font-bold">{counts[i] ?? "..."}</p>
    </Link>)}</div>
  </div>;
}
