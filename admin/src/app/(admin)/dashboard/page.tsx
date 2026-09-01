"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Heart,
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
  totalJobs: number;
  openJobs: number;
  closedJobs: number;
  totalInterests: number;
  liveNow: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      const [
        usersRes,
        activeUsersRes,
        providersRes,
        jobsRes,
        openJobsRes,
        closedJobsRes,
        interestsRes,
        liveRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .eq("is_deleted", false),
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("jobs").select("*", { count: "exact", head: true }),
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "closed"),
        supabase.from("job_interests").select("*", { count: "exact", head: true }),
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
        totalJobs: jobsRes.count ?? 0,
        openJobs: openJobsRes.count ?? 0,
        closedJobs: closedJobsRes.count ?? 0,
        totalInterests: interestsRes.count ?? 0,
        liveNow: liveRes.count ?? 0,
      });
      setLoading(false);
    };

    void load();
  }, []);

  if (loading || !stats) return <DashboardSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="High-level metrics across users, providers, jobs, and live sessions."
      />

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
        <StatCard label="Total jobs" value={stats.totalJobs} icon={Briefcase} tone="amber" />
        <StatCard label="Open jobs" value={stats.openJobs} icon={Briefcase} tone="green" />
        <StatCard label="Closed jobs" value={stats.closedJobs} icon={Briefcase} tone="blue" />
        <StatCard label="Job interests" value={stats.totalInterests} icon={Heart} tone="rose" />
      </div>
    </div>
  );
}
