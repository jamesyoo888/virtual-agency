import { createClient } from "@/lib/supabase/server";
import { generateConceptImages } from "@/lib/replicate/client";
import { NextResponse } from "next/server";

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

export async function POST(request: Request) {
  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, count = 4 } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const urls = await generateConceptImages(prompt, count);
  return NextResponse.json({ urls });
}
