import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Model } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";

const INDUSTRY_LABELS: Record<string, string> = {
  beauty: "뷰티", tech: "테크", food: "푸드",
  luxury: "럭셔리", sports: "스포츠", lifestyle: "라이프스타일",
};

const MOOD_LABELS: Record<string, string> = {
  cold: "차가운", warm: "따뜻한", neutral: "중성적", edgy: "엣지있는",
};

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

export default async function AdminModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!SUPABASE_CONFIGURED) {
    redirect("/admin/models");
  }

  const supabase = await createClient();

  const { data: model } = await supabase
    .from("models")
    .select("*")
    .eq("id", id)
    .single();

  if (!model) notFound();

  const m = model as Model;

  const debutDate = m.debut_date ? new Date(m.debut_date) : null;
  const ageYears = debutDate
    ? Math.floor(
        (Date.now() - debutDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      )
    : null;

  const { data: files } = await supabase
    .from("model_files")
    .select("*")
    .eq("model_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/models">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{m.name}</h1>
            <Badge
              className={
                m.status === "active"
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : m.status === "draft"
                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
              }
            >
              {m.status}
            </Badge>
          </div>
          {ageYears !== null && (
            <p className="text-zinc-400 text-sm mt-1">생체나이 {ageYears}세</p>
          )}
        </div>
        <Button variant="outline" className="border-zinc-700">
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Concept image */}
        <div className="col-span-1">
          {m.concept_image ? (
            <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-zinc-900">
              <Image
                src={m.concept_image}
                alt={m.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[3/4] rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-600">
              No image
            </div>
          )}
        </div>

        {/* Details */}
        <div className="col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="팔로워" value={m.follower_count.toLocaleString()} />
            <Stat label="기본 단가" value={m.base_price ? `₩${m.base_price.toLocaleString()}/일` : "-"} />
            <Stat label="독점 단가" value={m.exclusive_price ? `₩${m.exclusive_price.toLocaleString()}/일` : "-"} />
            <Stat label="독점 가능" value={m.is_exclusive_available ? "가능" : "불가"} />
          </div>

          {m.bio && (
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-2">바이오</h3>
              <p className="text-zinc-200 text-sm leading-relaxed">{m.bio}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">산업 태그</h3>
            <div className="flex flex-wrap gap-2">
              {m.industry_tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-zinc-800 text-zinc-300">
                  {INDUSTRY_LABELS[tag] ?? tag}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">분위기 태그</h3>
            <div className="flex flex-wrap gap-2">
              {m.mood_tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-zinc-800 text-zinc-300">
                  {MOOD_LABELS[tag] ?? tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio files */}
      {files && files.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4">생성 파일</h2>
          <div className="grid grid-cols-4 gap-3">
            {files.map((f) => (
              <div key={f.id} className="aspect-[3/4] relative rounded bg-zinc-900 overflow-hidden">
                <Image src={f.url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}
