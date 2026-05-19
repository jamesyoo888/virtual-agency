import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import InviteRedeemer from "@/components/invite-redeemer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "초대 — Virtual Agency",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InviteRedeemPage({ params }: Props) {
  const { token } = await params;

  if (!SUPABASE_CONFIGURED) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white px-6">
        <p className="text-sm text-zinc-400">Supabase가 설정되지 않은 환경입니다.</p>
      </main>
    );
  }

  // Require authentication first — sign-up + email verification finishes by
  // redirecting to /auth/callback?next=/invite/<token>, so the recipient lands
  // back here authed and we can call the RPC.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/invite/${encodeURIComponent(token)}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h1 className="text-lg font-semibold">관리자 초대 수락</h1>
        <p className="text-sm text-zinc-400">
          이 토큰을 사용하면 현재 로그인 계정 ({user.email}) 이 관리자로 승격됩니다.
        </p>
        <InviteRedeemer token={token} />
      </div>
    </main>
  );
}
