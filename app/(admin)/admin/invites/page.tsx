import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import InvitesPanel, { type InviteRow } from "@/components/invites-panel";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  let rows: InviteRow[] = [];

  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("admin_invites")
      .select("id, token, email_hint, used_by, used_at, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    rows = (data as InviteRow[] | null) ?? [];
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Admin Invites</h1>
      <p className="text-sm text-zinc-400 mb-6">
        새 운영자에게 admin 권한을 부여하기 위한 1회용 토큰을 발급합니다. 토큰은 만료 후 자동
        무효화됩니다.
      </p>
      <InvitesPanel initial={rows} />
    </div>
  );
}
