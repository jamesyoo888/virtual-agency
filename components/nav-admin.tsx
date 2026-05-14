"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, Image, Video, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

const links = [
  { href: "/admin/models", label: "Model Studio", icon: Users },
  { href: "/admin/image-studio", label: "Image Studio", icon: Image },
  { href: "/admin/video-studio", label: "Video Studio", icon: Video },
];

interface Props {
  userEmail?: string | null;
}

export default function NavAdmin({ userEmail }: Props = {}) {
  const pathname = usePathname();
  const router = useRouter();

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
