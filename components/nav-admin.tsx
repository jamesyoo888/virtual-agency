"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  Image,
  Video,
  LayoutDashboard,
  LogOut,
  Receipt,
  Inbox,
  BarChart3,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

const links = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/models", label: "Model Studio", icon: Users },
  { href: "/admin/image-studio", label: "Image Studio", icon: Image },
  { href: "/admin/video-studio", label: "Video Studio", icon: Video },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/usage", label: "Usage", icon: Receipt },
];

interface Props {
  userEmail?: string | null;
}

interface UsageTotals {
  daily: number;
  weekly: number;
  monthly: number;
}

interface CapCfg {
  perCall: number | null;
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
}

export default function NavAdmin({ userEmail }: Props = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [totals, setTotals] = useState<UsageTotals | null>(null);
  const [caps, setCaps] = useState<CapCfg | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/usage", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { totals: UsageTotals; caps: CapCfg };
        if (cancelled) return;
        setTotals(data.totals);
        setCaps(data.caps);
      } catch {
        // ignore — sidebar is non-critical
      }
    }
    load();
    // refresh every 60s so the sidebar reflects recent calls.
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  async function handleLogout() {
    if (!SUPABASE_CONFIGURED) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="w-56 shrink-0 border-r border-zinc-800 flex flex-col min-h-screen">
      <div className="px-5 py-6 border-b border-zinc-800">
        <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Virtual Agency</p>
        <p className="text-xs text-zinc-600 mt-0.5">Admin</p>
      </div>

      <div className="flex-1 p-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </div>

      <div className="border-t border-zinc-800 p-3 space-y-1">
        {totals && (
          <Link
            href="/admin/usage"
            className="block px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span>오늘</span>
              <span className="tabular-nums font-medium text-zinc-300">
                ${totals.daily.toFixed(2)}
                {caps?.daily ? (
                  <span className="text-zinc-600">
                    {" "}
                    / ${caps.daily.toFixed(0)}
                  </span>
                ) : null}
              </span>
            </div>
            {caps?.daily ? (
              <div className="mt-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    totals.daily / caps.daily >= 0.9
                      ? "bg-red-500"
                      : totals.daily / caps.daily >= 0.6
                      ? "bg-yellow-500"
                      : "bg-emerald-500"
                  )}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((totals.daily / caps.daily) * 100)
                    )}%`,
                  }}
                />
              </div>
            ) : null}
          </Link>
        )}
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          Showcase
        </Link>
        {SUPABASE_CONFIGURED && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        )}
        {userEmail && (
          <p
            className="px-3 pt-2 text-[10px] text-zinc-600 truncate"
            title={userEmail}
          >
            {userEmail}
          </p>
        )}
      </div>
    </nav>
  );
}
