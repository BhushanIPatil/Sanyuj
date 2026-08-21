"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { displayPhone } from "@/lib/auth/phone";
import { categoryDisplayName } from "@/lib/categories";
import { useToast } from "@/components/Toast";

type Profile = {
  full_name: string | null;
  phone: string;
  pincode: string | null;
  address: string | null;
  current_address: string | null;
};

type Business = {
  id: string;
  name: string;
  rating: number;
  jobs_done: number;
  response_rate: number;
  categories: { id: string; name: string; slug: string } | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(prof);
      const { data: biz } = await supabase
        .from("businesses")
        .select("id, name, rating, jobs_done, response_rate, categories(id, name, slug)")
        .eq("owner_id", user.id)
        .maybeSingle();
      setBusiness(biz as unknown as Business | null);
    };
    void load();
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U";

  return (
    <div className="page-pad">
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 font-display text-[19px] font-bold">Profile</h1>
      </header>

      <div className="flex flex-col items-center pt-2 text-center">
        <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-[26px] grad-hero font-display text-[26px] font-extrabold text-white shadow-pop">
          {initials}
        </div>
        <h2 className="font-display text-lg font-bold">{profile?.full_name ?? "Your name"}</h2>
        <p className="mt-1 font-mono text-xs text-ink-soft">
          {profile?.phone ? displayPhone(profile.phone) : ""}
        </p>
      </div>

      <div className="mt-4 rounded-[18px] border border-line bg-white p-3.5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Location</p>
            <p className="mt-1 font-mono text-sm font-bold">{profile?.pincode ?? "—"}</p>
            {profile?.address ? (
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{profile.address}</p>
            ) : null}
            {profile?.current_address ? (
              <p className="mt-2 text-[11px] leading-relaxed text-green-deep">
                Live · {profile.current_address}
              </p>
            ) : null}
          </div>
          <button
            className="shrink-0 rounded-full bg-blue-soft px-3 py-1.5 text-[11px] font-bold text-blue-deep"
            onClick={() => showToast("Edit location from onboarding data in a later update")}
          >
            Edit
          </button>
        </div>
      </div>

      {!business ? (
        <div className="mt-4 rounded-[26px] border-[1.5px] border-dashed border-line p-4.5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-blue-soft text-lg">
              🏪
            </div>
            <div>
              <h3 className="font-display text-sm font-bold">List your business</h3>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">
                Get job requests from nearby customers — free, takes under a minute.
              </p>
            </div>
          </div>
          <Link href="/app/business/setup" className="btn-primary mt-3.5 !rounded-full !py-3 text-[13px]">
            Get Started
          </Link>
        </div>
      ) : (
        <div
          className="mt-4 rounded-[26px] p-4.5 shadow-card"
          style={{ background: "linear-gradient(135deg,#F2F9FF 0%,#EFFBF5 100%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-13 w-13 items-center justify-center rounded-[16px] grad-hero font-display text-base font-bold text-white">
              {business.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[15px] font-bold">{business.name}</p>
              <span className="mt-1 inline-block rounded-full bg-blue-soft px-2.5 py-1 text-[10.5px] font-bold text-blue-deep">
                {categoryDisplayName(business.categories)}
              </span>
            </div>
          </div>
          <div className="mt-3.5 flex gap-2.5">
            {[
              [String(business.jobs_done), "Jobs Done"],
              [`${business.rating.toFixed(1)}★`, "Rating"],
              [`${business.response_rate}%`, "Response"],
            ].map(([v, l]) => (
              <div key={l} className="flex-1 rounded-[12px] bg-white p-2.5 text-center">
                <div className="font-mono text-[13px] font-bold">{v}</div>
                <div className="mt-0.5 text-[9px] uppercase tracking-wide text-ink-soft">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-3.5 flex gap-2.5">
            <Link
              href="/app/my-interests"
              className="flex-1 rounded-full border-[1.5px] border-line bg-white py-2.5 text-center text-[11.5px] font-bold"
            >
              My Interests
            </Link>
            <Link
              href="/app/jobs-feed"
              className="flex-1 rounded-full grad-hero py-2.5 text-center text-[11.5px] font-bold text-white"
            >
              Open Job Feed →
            </Link>
          </div>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-[18px] border border-line bg-white shadow-card">
        {[
          { href: "/app/my-jobs", label: "My Jobs" },
          { href: "/app/explore", label: "Saved Providers" },
          { href: "#", label: "Notifications", onClick: () => showToast("No notifications") },
          { href: "#", label: "Help & Support", onClick: () => showToast("Email support@sanyuj.app") },
        ].map((item) =>
          item.href === "#" ? (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="flex w-full items-center justify-between border-b border-line px-4 py-4 text-left text-[13px] font-semibold"
            >
              {item.label}
              <span className="text-ink-faint">›</span>
            </button>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between border-b border-line px-4 py-4 text-[13px] font-semibold"
            >
              {item.label}
              <span className="text-ink-faint">›</span>
            </Link>
          ),
        )}
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center px-4 py-4 text-left text-[13px] font-semibold text-rose"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
