"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Client } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/client/dashboard", label: "프로젝트" },
  { href: "/client/products", label: "상품 관리" },
];


export default function NavClient({ client }: { client: Client | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="border-b border-zinc-800 px-8 py-4 flex items-center gap-6">
      <Link href="/" className="text-sm font-bold tracking-widest uppercase text-zinc-300 hover:text-white">
        Virtual Agency
      </Link>
      <nav className="flex gap-1 flex-1">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-3 py-1.5 rounded text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        {client?.company && (
          <span className="text-sm text-zinc-500">{client.company}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white"
          onClick={handleLogout}
        >
          로그아웃
        </Button>
      </div>
    </header>
  );
}
