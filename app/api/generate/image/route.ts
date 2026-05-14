import { generateConceptImages } from "@/lib/replicate/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { prompt, count = 4, negative_prompt } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const urls = await generateConceptImages(prompt, count, negative_prompt);
  return NextResponse.json({ urls });
}
