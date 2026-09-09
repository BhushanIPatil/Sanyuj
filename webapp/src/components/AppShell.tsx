"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  FileText,
  HelpCircle,
  Home,
  Menu,
  ScrollText,
  Search,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import { loginUrl } from "@/lib/auth/guest";
import { locationLabel } from "@/lib/geo/display";
import { useConfirm } from "@/components/ConfirmDialog";
import { SanyujBrand } from "@/components/SanyujLogo";

export const APP_NAV = [
  { href: "/app", label: "Home", icon: Home, match: "/app", exact: true },
  { href: "/app/explore", label: "Explore", icon: Search, match: "/app/explore" },
  { href: "/app/profile", label: "Profile", icon: User, match: "/app/profile" },
] as const;

const TERMS_URL = "/terms";
const PRIVACY_URL = "/privacy";
const HELP_URL = "/help";

type ShellProfile = {
  full_name: string | null;
  pincode: string | null;
  locality: string | null;
  area: string | null;
  address: string | null;
};

function isActive(pathname: string, match: string, exact?: boolean) {
  if (exact || match === "/app") return pathname === "/app";
  return pathname.startsWith(match);
}

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "S";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function NavLinks({
  pathname,
  onNavigate,
  variant,
}: {
  pathname: string;
  onNavigate?: () => void;
  variant: "top" | "menu";
}) {
  return (
    <>
      {APP_NAV.map((item) => {
        const active = isActive(pathname, item.match, "exact" in item ? item.exact : false);
        const Icon = item.icon;
        if (variant === "top") {
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`inline-flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-blue-soft text-blue-deep"
                  : "text-ink-soft hover:bg-surface hover:text-ink"
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-sm font-semibold transition ${
              active
                ? "bg-blue-soft text-blue-deep"
                : "text-ink-soft hover:bg-surface hover:text-ink"
            }`}
          >
            <Icon size={18} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function ProfileMenu({
  guest,
  onClose,
}: {
  guest: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();

  async function logout() {
    onClose();
    const ok = await confirm({
      title: "Log out of Sanyuj?",
      message: "You can sign back in anytime with the same email.",
      confirmLabel: "Log out",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  return (
    <div
      role="menu"
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] overflow-hidden rounded-[16px] border border-line bg-white py-1.5 shadow-pop"
    >
      {guest ? (
        <Link
          href={loginUrl(pathname)}
          role="menuitem"
          onClick={onClose}
          className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-blue-deep hover:bg-surface"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-blue-soft text-blue-deep">
            <User size={15} />
          </span>
          Log in
        </Link>
      ) : (
        <Link
          href="/app/profile"
          role="menuitem"
          onClick={onClose}
          className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-blue-soft text-blue-deep">
            <User size={15} />
          </span>
          My Profile
        </Link>
      )}
      <Link
        href={TERMS_URL}
        role="menuitem"
        onClick={onClose}
        className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-indigo-soft text-indigo">
          <ScrollText size={15} />
        </span>
        Terms of Use
      </Link>
      <Link
        href={PRIVACY_URL}
        role="menuitem"
        onClick={onClose}
        className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-teal-soft text-teal">
          <FileText size={15} />
        </span>
        Privacy Policy
      </Link>
      <Link
        href={HELP_URL}
        role="menuitem"
        onClick={onClose}
        className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-green-soft text-green-deep">
          <HelpCircle size={15} />
        </span>
        Help and support
      </Link>
      {!guest ? (
        <>
          <div className="my-1.5 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm font-semibold text-rose hover:bg-rose-soft"
          >
            Log out
          </button>
        </>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [guest, setGuest] = useState(true);
  const [profile, setProfile] = useState<ShellProfile | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile(userId: string | undefined) {
      if (!userId) {
        setGuest(true);
        setProfile(null);
        return;
      }
      setGuest(false);
      const { data } = await visible(
        supabase
          .from("profiles")
          .select("full_name, pincode, locality, area, address"),
      )
        .eq("id", userId)
        .maybeSingle();
      setProfile((data as ShellProfile | null) ?? null);
    }

    void supabase.auth.getUser().then(({ data: { user } }) => {
      void loadProfile(user?.id);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session?.user?.id);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  const firstName = guest ? "there" : (profile?.full_name?.split(" ")[0] ?? "there");
  const address = guest
    ? "Browsing as guest"
    : locationLabel({
        area: profile?.area,
        locality: profile?.locality,
        pincode: profile?.pincode,
        address: profile?.address,
      });
  const addressLine =
    !guest && (!address || address === "—") ? "Set your location" : address;

  return (
    <div className="min-h-screen bg-bg-page">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 lg:h-16 lg:px-6">
          <SanyujBrand href="/app" size={44} priority />

          <nav className="ml-2 hidden items-center gap-0.5 md:flex">
            <NavLinks pathname={pathname} variant="top" />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div ref={profileRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label="Account menu"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex max-w-[min(52vw,220px)] items-center gap-2 rounded-[14px] border border-line bg-white py-1.5 pl-1.5 pr-2 shadow-card transition hover:border-blue-deep/30 sm:max-w-[280px] sm:gap-2.5 sm:pr-2.5 lg:max-w-xs"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-blue-soft font-display text-xs font-extrabold text-blue-deep">
                  {guest ? "S" : initials(profile?.full_name)}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[12px] font-bold leading-tight text-ink sm:text-[13px]">
                    {guest ? "Hi there" : `Hi, ${firstName}`}
                  </span>
                  <span className="mt-0.5 block truncate text-[10.5px] leading-snug text-ink-soft sm:text-[11px]">
                    {addressLine}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-ink-soft transition ${profileOpen ? "rotate-180" : ""}`}
                />
              </button>
              {profileOpen ? (
                <ProfileMenu guest={guest} onClose={() => setProfileOpen(false)} />
              ) : null}
            </div>

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-line bg-white md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="space-y-1 border-t border-line bg-white px-3 py-3 md:hidden">
            <NavLinks
              pathname={pathname}
              variant="menu"
              onNavigate={() => setMenuOpen(false)}
            />
          </nav>
        ) : null}
      </header>

      {guest ? (
        <div className="border-b border-line bg-blue-soft px-4 py-2 text-center text-xs font-semibold text-blue-deep">
          Browsing as guest.{" "}
          <Link href={loginUrl(pathname)} className="font-bold underline">
            Log in
          </Link>{" "}
          to list a business.
        </div>
      ) : null}

      <main className="mx-auto min-h-[calc(100vh-3.5rem)] w-full max-w-6xl bg-bg-app pb-8 lg:min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
