import { createClient } from "@/lib/supabase/server";
import { generateConceptImages } from "@/lib/replicate/client";
import { NextResponse } from "next/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export async function POST(request: Request) {
  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, count = 4, negative_prompt } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const urls = await generateConceptImages(prompt, count, negative_prompt);
  return NextResponse.json({ urls });
}
