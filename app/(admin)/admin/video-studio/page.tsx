import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import type { Model } from "@/types";
import VideoStudio from "@/components/video-studio";

export const dynamic = "force-dynamic";

export default async function VideoStudioPage() {
  let models: Model[] = [];

  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("models")
      .select("id, name, concept_image")
      .order("created_at", { ascending: false });
    models = (data as Model[]) ?? [];
  } else {
    models = devModelStore.list() as Model[];
  }

  return <VideoStudio models={models} />;
}
