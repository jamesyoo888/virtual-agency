import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import {
  DEFAULT_PREFERENCES,
  getClientPreferences,
} from "@/lib/preferences";
import PreferencesForm from "@/components/preferences-form";

export const dynamic = "force-dynamic";

export default async function ClientPreferencesPage() {
  if (!SUPABASE_CONFIGURED) {
    return (
      <PreferencesForm initial={DEFAULT_PREFERENCES} disabled />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/client/preferences");

  const prefs = await getClientPreferences(user.id);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-2">알림 설정</h1>
      <p className="text-sm text-zinc-400 mb-8">
        이메일과 화면 알림을 항목별로 켜고 끌 수 있습니다. 즉시 저장됩니다.
      </p>
      <PreferencesForm initial={prefs} />
    </div>
  );
}
