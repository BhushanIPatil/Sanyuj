"use client";

import { useEffect, useState } from "react";
import {
  Radio,
  Store,
  UserCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  providers: number;
  liveNow: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      const [usersRes, activeUsersRes, providersRes, liveRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .eq("is_deleted", false),
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase
          .from("live_sessions")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .eq("is_deleted", false),
      ]);

      setStats({
        totalUsers: usersRes.count ?? 0,
        activeUsers: activeUsersRes.count ?? 0,
        providers: providersRes.count ?? 0,
        liveNow: liveRes.count ?? 0,
      });
      setLoading(false);
    };

    void load();
  }, []);

  if (loading || !stats) return <DashboardSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader title="Dashboard" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={stats.totalUsers} icon={Users} tone="blue" />
        <StatCard
          label="Active users"
          value={stats.activeUsers}
          hint={`${stats.totalUsers - stats.activeUsers} inactive or deleted`}
          icon={UserCheck}
          tone="green"
        />
        <StatCard label="Providers" value={stats.providers} icon={Store} tone="indigo" />
        <StatCard label="Live now" value={stats.liveNow} icon={Radio} tone="teal" />
      </div>
    </div>
  );
}
