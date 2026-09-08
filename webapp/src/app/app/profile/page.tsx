"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ScrollText,
  Store,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { displayPhone } from "@/lib/auth/phone";
import { categoryDisplayName } from "@/lib/categories";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { visible } from "@/lib/db/visible";
import { ProfilePageSkeleton } from "@/components/ui/Skeleton";
import { GuestCta } from "@/components/GuestCta";
import { locationLabel } from "@/lib/geo/display";

type Profile = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  pincode: string | null;
  locality: string | null;
  area: string | null;
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
  const confirm = useConfirm();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setGuest(true);
          return;
        }
        const { data: prof } = await visible(supabase.from("profiles").select("*"))
          .eq("id", user.id)
          .single();
        setProfile(prof);
        const { data: biz } = await visible(
          supabase
            .from("businesses")
            .select("id, name, rating, jobs_done, response_rate, categories(id, name, slug)"),
        )
          .eq("owner_id", user.id)
          .maybeSingle();
        setBusiness(biz as unknown as Business | null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  async function logout() {
    const ok = await confirm({
      title: "Log out of Sanyuj?",
      message: "You can sign back in anytime with the same email.",
      confirmLabel: "Log out",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  async function deleteAccount() {
    const ok = await confirm({
      title: "Delete account?",
      message:
        "This permanently deactivates your Sanyuj account and associated jobs/business data. You can restore later by registering again with the same email.",
      confirmLabel: "Delete account",
      tone: "danger",
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete account");
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/auth/login");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete account");
      setDeleting(false);
    }
  }

  if (loading) return <ProfilePageSkeleton />;

  if (guest) {
    return (
      <div className="page-pad">
        <h1 className="font-display text-[19px] font-bold">Profile</h1>
        <div className="mt-6 max-w-lg">
          <GuestCta
            title="You're browsing as a guest"
            body="Log in with your email to post jobs, save your location, and list a business."
            next="/app/profile"
          />
        </div>
      </div>
    );
  }

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U";

  const location = locationLabel({
    area: profile?.area,
    locality: profile?.locality,
    pincode: profile?.pincode,
    address: profile?.address,
  });

  const changePasswordHref = profile?.email
    ? `/auth/login?forgot=1&email=${encodeURIComponent(profile.email)}`
    : "/auth/login?forgot=1";

  return (
    <div className="page-pad">
      <h1 className="font-display text-[19px] font-bold">Profile</h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <div className="rounded-[22px] border border-line bg-white p-5 shadow-card">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] border-[3px] border-white bg-blue-deep font-display text-[26px] font-extrabold text-white shadow-pop">
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold">
                  {profile?.full_name ?? "Your name"}
                </h2>
                <p className="mt-1 text-xs text-ink-soft">Your Sanyuj account</p>
              </div>
            </div>

            <Link
              href="/app/profile/edit"
              className="mt-4 flex items-center gap-3 rounded-[18px] border border-line bg-surface/60 p-3.5 text-left transition hover:border-blue-deep/40"
            >
              <div className="min-w-0 flex-1 space-y-2">
                {profile?.email ? (
                  <div className="flex items-center gap-2 text-[12.5px] font-medium text-ink-soft">
                    <Mail size={16} className="shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                ) : null}
                {profile?.phone ? (
                  <div className="flex items-center gap-2 font-mono text-[12.5px] font-medium text-ink-soft">
                    <Phone size={16} className="shrink-0" />
                    <span>{displayPhone(profile.phone)}</span>
                  </div>
                ) : null}
                {location ? (
                  <div className="flex items-start gap-2 text-[12.5px] font-medium leading-snug text-ink-soft">
                    <MapPin size={16} className="mt-0.5 shrink-0" />
                    <span>{location}</span>
                  </div>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full bg-blue-soft px-3 py-1.5 text-[11px] font-bold text-blue-deep">
                Edit
              </span>
            </Link>
          </div>

          {!business ? (
            <div className="rounded-[22px] border border-line bg-white p-[18px] shadow-card">
              <div className="flex items-start gap-3.5">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[15px] bg-blue-soft">
                  <Store size={20} className="text-blue-deep" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold">List your business</h3>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                    Get job requests from nearby customers — free, takes under a minute.
                  </p>
                </div>
              </div>
              <Link
                href="/app/business/setup"
                className="mt-3.5 block rounded-full bg-blue-deep py-3 text-center text-[13px] font-bold text-white"
              >
                Get Started
              </Link>
            </div>
          ) : (
            <div className="rounded-[22px] bg-blue-soft p-[18px] shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-blue-deep font-display text-base font-bold text-white">
                  {business.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[15px] font-bold">{business.name}</p>
                  <span className="mt-1 inline-block rounded-full bg-white/80 px-2.5 py-1 text-[10.5px] font-bold text-blue-deep">
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
                  href="/app/business/coverage"
                  className="flex-1 rounded-full border-[1.5px] border-line bg-white py-2.5 text-center text-[11.5px] font-bold"
                >
                  Service areas
                </Link>
                <Link
                  href="/app/jobs-feed"
                  className="flex-1 rounded-full bg-blue-deep py-2.5 text-center text-[11.5px] font-bold text-white"
                >
                  Open Job Feed →
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-card">
            <Link
              href="/terms"
              className="flex items-center gap-3 border-b border-line px-4 py-[15px]"
            >
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-surface text-indigo">
                <ScrollText size={16} />
              </span>
              <span className="flex-1 text-[13px] font-semibold">Terms of Use</span>
              <span className="text-ink-faint">›</span>
            </Link>
            <Link
              href="/privacy"
              className="flex items-center gap-3 border-b border-line px-4 py-[15px]"
            >
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-surface text-teal">
                <FileText size={16} />
              </span>
              <span className="flex-1 text-[13px] font-semibold">Privacy Policy</span>
              <span className="text-ink-faint">›</span>
            </Link>
            <Link
              href="/help"
              className="flex items-center gap-3 border-b border-line px-4 py-[15px]"
            >
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-surface text-green-deep">
                <HelpCircle size={16} />
              </span>
              <span className="flex-1 text-[13px] font-semibold">Help &amp; Support</span>
              <span className="text-ink-faint">›</span>
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-[15px] text-left"
            >
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-surface text-rose">
                <LogOut size={16} />
              </span>
              <span className="text-[13px] font-semibold text-rose">Log out</span>
            </button>
          </div>

          <div>
            <p className="px-1 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
              Account settings
            </p>
            <div className="mt-2 overflow-hidden rounded-[18px] border border-line bg-white shadow-card">
              <Link
                href={changePasswordHref}
                className="flex items-center gap-3 px-4 py-[15px]"
              >
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-surface text-blue-deep">
                  <Lock size={16} />
                </span>
                <span className="flex-1 text-[13px] font-semibold">Change password</span>
                <span className="text-ink-faint">›</span>
              </Link>
            </div>
          </div>

          <div>
            <p className="px-1 text-[10.5px] font-bold uppercase tracking-wide text-rose">
              Danger zone
            </p>
            <div className="mt-2 rounded-[18px] border border-line bg-white p-3.5 shadow-card">
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                Delete your account and associated data from Sanyuj.
              </p>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void deleteAccount()}
                className="mt-3 w-full cursor-pointer rounded-[14px] border-[1.5px] border-rose py-3 text-sm font-bold text-rose disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto lg:px-6"
              >
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
            <p className="mt-3 px-1 text-[11px] leading-relaxed text-ink-faint">
              Account deletion is required by Google Play policy. Deleting soft-removes your data
              from Sanyuj.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
