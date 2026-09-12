"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardPlus,
  ChevronDown,
  FileText,
  HelpCircle,
  Home,
  Menu,
  ScrollText,
  Wrench,
  Tag,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useUserLocation } from "@/components/UserLocation";
import { SanyujBrand } from "@/components/SanyujLogo";

export const APP_NAV = [
  { href: "/app/offerly", label: "Offerly", icon: Tag, match: "/app/offerly" },
  { href: "/app/notifications", label: "Notify", icon: Bell, match: "/app/notifications" },
  { href: "/app", label: "Home", icon: Home, match: "/app", exact: true },
  { href: "/app/services", label: "Services", icon: Wrench, match: "/app/services" },
  { href: "/app/requests", label: "Submit Request", icon: ClipboardPlus, match: "/app/requests" },
] as const;

const TERMS_URL = "/terms";
const PRIVACY_URL = "/privacy";
const HELP_URL = "/help";

function isActive(pathname: string, match: string, exact?: boolean) {
  if (exact || match === "/app") return pathname === "/app";
  return pathname.startsWith(match);
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

function ProfileMenu({ onClose }: { onClose: () => void }) {
  return (
    <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] overflow-hidden rounded-[16px] border border-line bg-white py-1.5 shadow-pop">
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
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { address } = useUserLocation();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close transient navigation menus after external route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const addressLine = address || "Set your location in filters";

  return (
    <div className="min-h-screen bg-bg-page">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 lg:h-16 lg:px-6">
          <SanyujBrand href="/app" size={44} priority />

          <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
            <NavLinks pathname={pathname} variant="top" />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div ref={profileRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label="Sanyuj menu"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex max-w-[min(52vw,220px)] items-center gap-2 rounded-[14px] border border-line bg-white py-1.5 pl-1.5 pr-2 shadow-card transition hover:border-blue-deep/30 sm:max-w-[280px] sm:gap-2.5 sm:pr-2.5 lg:max-w-xs"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-blue-soft font-display text-xs font-extrabold text-blue-deep">
                  S
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[12px] font-bold leading-tight text-ink sm:text-[13px]">
                    Sanyuj
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
                <ProfileMenu onClose={() => setProfileOpen(false)} />
              ) : null}
            </div>

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-line bg-white lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="space-y-1 border-t border-line bg-white px-3 py-3 lg:hidden">
            <NavLinks
              pathname={pathname}
              variant="menu"
              onNavigate={() => setMenuOpen(false)}
            />
          </nav>
        ) : null}
      </header>

      <main className="mx-auto min-h-[calc(100vh-3.5rem)] w-full max-w-6xl bg-bg-app pb-8 lg:min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
