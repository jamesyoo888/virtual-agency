import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Creator section layout. Gate the route at the layout level so the
 * dashboard, model detail, and any future creator-only pages share one auth
 * + isCreator check.
 *
 * "isCreator" here = the authed user owns at least one row in `models`. We
 * intentionally do not introduce a new clients.role value yet; ownership
 * itself is the signal. If the user is logged in but owns no models, we
 * surface a friendly empty state with a link to /creator/onboard later —
 * for now they bounce back to /client/dashboard.
 */

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  if (!SUPABASE_CONFIGURED) {
    return (
      <main className="min-h-screen bg-black text-zinc-200 grid place-items-center p-8">
        <p className="text-sm text-zinc-500">크리에이터 영역은 Supabase 연결이 필요합니다.</p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/creator/dashboard");

  // Inexpensive gate — pull the first owned model id only.
  const { data: anyModel } = await supabase
    .from("models")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  const isCreator = (anyModel?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-black text-zinc-200">
      <header className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-bold tracking-widest uppercase">
            Virtual Agency
          </Link>
          {isCreator && (
            <nav className="flex items-center gap-4 text-sm text-zinc-400">
              <Link href="/creator/dashboard" className="hover:text-white">Dashboard</Link>
            </nav>
          )}
        </div>
        <p className="text-xs text-zinc-600 truncate max-w-[12rem]" title={user.email ?? ""}>
          {user.email}
        </p>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
