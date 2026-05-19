import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import type { Model } from "@/types";
import ModelCard from "@/components/model-card";
import { Bookmark } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "북마크 — Virtual Agency" };

export default async function ClientBookmarksPage() {
  if (!SUPABASE_CONFIGURED) {
    return (
      <p className="text-sm text-zinc-500">Supabase 가 연결되지 않았습니다.</p>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/client/bookmarks");

  // Two queries: bookmark ids (own RLS), then the active model rows. We do
  // the join in JS so each surface uses its natural RLS — bookmarks read as
  // the user, models read as anyone (public_read_active_models).
  const { data: bookmarks } = await supabase
    .from("model_bookmarks")
    .select("model_id, created_at")
    .order("created_at", { ascending: false });

  const ids = (bookmarks ?? []).map((b) => b.model_id as string);
  const { data: models } = ids.length > 0
    ? await supabase.from("models").select("*").in("id", ids).eq("status", "active")
    : { data: [] };

  // Preserve the bookmark order rather than re-sorting by model fields.
  const modelById = new Map(((models ?? []) as Model[]).map((m) => [m.id, m]));
  const ordered = ids.map((id) => modelById.get(id)).filter(Boolean) as Model[];

  return (
    <div>
      <header className="flex items-center gap-3 mb-6">
        <Bookmark className="w-5 h-5 text-zinc-400" />
        <div>
          <h1 className="text-2xl font-bold">북마크</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            나중에 다시 보고 싶은 모델을 모아두세요.
          </p>
        </div>
      </header>

      {ordered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center text-sm text-zinc-500">
          <p>아직 북마크한 모델이 없습니다.</p>
          <Link
            href="/"
            className="mt-3 inline-block text-zinc-300 hover:text-white underline underline-offset-2"
          >
            카탈로그 둘러보기 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {ordered.map((m) => (
            <ModelCard key={m.id} model={m} variant="showcase" layout="card" />
          ))}
        </div>
      )}
    </div>
  );
}
