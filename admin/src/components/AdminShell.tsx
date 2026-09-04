"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
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
  { href: "/jobs", label: "Jobs", icon: Briefcase, match: "/jobs" },
  { href: "/live", label: "Live", icon: Radio, match: "/live" },
  { href: "/ads", label: "Ads", icon: Megaphone, match: "/ads" },
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
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {ADMIN_NAV.map((item) => {
        const active = isActive(pathname, item.match, "exact" in item ? item.exact : false);
        const Icon = item.icon;
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

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-bg-page">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-white lg:flex">
        <div className="flex flex-col items-center px-4 py-5">
          <SanyujBrand href="/dashboard" size={108} priority />
          <p className="mt-2 text-center text-[11px] font-semibold text-ink-faint">Admin console</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="border-t border-line p-4">
          <p className="truncate text-xs font-semibold text-ink-soft">{adminName}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-card"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <SanyujBrand href="/dashboard" size={44} />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[12px] border border-line bg-white"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {menuOpen ? (
          <nav className="space-y-1 border-t border-line bg-white px-3 py-3">
            <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-line px-4 py-3 text-sm font-bold text-ink"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </nav>
        ) : null}
      </header>

      <div className="lg:pl-64">
        <main className="mx-auto min-h-screen w-full max-w-7xl bg-bg-app">
          {children}
        </main>
      </div>
    </div>
  );
}
