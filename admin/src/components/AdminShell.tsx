"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FolderTree,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Bell,
  Newspaper,
  Radio,
  Store,
  Users,
  X,
  MapPinned,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SanyujBrand } from "@/components/SanyujLogo";

export const ADMIN_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: "/dashboard", exact: true },
  { href: "/users", label: "Users", icon: Users, match: "/users" },
  { href: "/providers", label: "Providers", icon: Store, match: "/providers" },
  { href: "/live", label: "Live", icon: Radio, match: "/live" },
  { href: "/ads", label: "Ads", icon: Megaphone, match: "/ads" },
  { href: "/notices", label: "Notices", icon: Newspaper, match: "/notices", exact: true },
  { href: "/notifications", label: "Push", icon: Bell, match: "/notifications" },
  { href: "/categories", label: "Categories", icon: FolderTree, match: "/categories" },
  { href: "/areas", label: "Areas", icon: MapPinned, match: "/areas" },
  { href: "/app-versions", label: "App versions", icon: Smartphone, match: "/app-versions" },
] as const;

function isActive(pathname: string, match: string, exact?: boolean) {
  if (exact) return pathname === match;
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
      {ADMIN_NAV.map((item) => {
        const active = isActive(pathname, item.match, "exact" in item ? item.exact : false);
        const Icon = item.icon;
        if (variant === "top") {
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-[12px] px-2.5 py-2 text-[13px] font-semibold transition lg:px-3 lg:text-sm ${
                active
                  ? "bg-blue-soft text-blue-deep"
                  : "text-ink-soft hover:bg-surface hover:text-ink"
              }`}
            >
              <Icon size={15} strokeWidth={2} className="shrink-0" />
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

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("admins")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      setAdminName(data?.full_name || data?.email || "Admin");
    });
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-bg-page">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full items-center gap-3 px-4 lg:h-16 lg:px-6">
          <SanyujBrand href="/dashboard" size={44} priority />
          

          <nav className="ml-1 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex">
            <NavLinks pathname={pathname} variant="top" />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <p className="hidden max-w-[10rem] truncate text-xs font-semibold text-ink-soft xl:block">
              {adminName}
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="hidden cursor-pointer items-center gap-1.5 rounded-[12px] border border-line bg-white px-3 py-2 text-xs font-bold text-ink shadow-card lg:inline-flex"
            >
              <LogOut size={14} />
              Sign out
            </button>
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[12px] border border-line bg-white lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="space-y-1 border-t border-line bg-white px-3 py-3 lg:hidden">
            <NavLinks pathname={pathname} variant="menu" onNavigate={() => setMenuOpen(false)} />
            <p className="truncate px-3.5 pt-2 text-xs font-semibold text-ink-soft">{adminName}</p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-line px-4 py-3 text-sm font-bold text-ink"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto min-h-[calc(100vh-3.5rem)] w-full bg-bg-app lg:min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
