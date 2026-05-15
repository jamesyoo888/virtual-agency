import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import { Model, ModelFile } from "@/types";
import { Badge } from "@/components/ui/badge";
import InquiryForm from "@/components/inquiry-form";
import { INDUSTRY_LABELS, GENRE_LABELS, MOOD_LABELS } from "@/lib/tags";
import { ageInYears } from "@/lib/utils";
import PriceCalculator from "@/components/price-calculator";
import PortfolioGallery from "@/components/portfolio-gallery";
import ReviewList, { type PublicReview } from "@/components/review-list";
import { aggregateApproved } from "@/lib/reviews";
import { trackModelView } from "@/lib/analytics/track-view";
import {
  breadcrumbLd,
  ldScript,
  modelOfferLd,
  modelPersonLd,
} from "@/lib/seo/json-ld";

type Params = { id: string };

async function fetchModel(id: string): Promise<{
  model: Model | null;
  files: ModelFile[];
}> {
  if (!SUPABASE_CONFIGURED) {
    const dev = devModelStore.get(id);
    if (!dev || dev.status !== "active") return { model: null, files: [] };
    return { model: dev as Model, files: [] };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("models")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .single();
  if (!data) return { model: null, files: [] };

  const { data: files } = await supabase
    .from("model_files")
    .select("*")
    .eq("model_id", id)
    .order("created_at", { ascending: false })
    .limit(12);

  return { model: data as Model, files: (files as ModelFile[]) ?? [] };
}

async function fetchApprovedReviews(
  modelId: string
): Promise<PublicReview[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, client:clients(company)")
    .eq("model_id", modelId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(12);
  if (!data) return [];
  return (data as unknown as Array<{
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    client?: { company: string | null } | null;
  }>).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    client_company: r.client?.company ?? null,
  }));
}

async function fetchSimilarModels(model: Model, limit = 4): Promise<Model[]> {
  const tags = [...(model.industry_tags ?? []), ...(model.genre_tags ?? [])];
  if (!SUPABASE_CONFIGURED) {
    return (devModelStore.list() as Model[])
      .filter((m) => m.id !== model.id && m.status === "active")
      .filter((m) =>
        tags.some(
          (t) =>
            (m.industry_tags?.includes(t as never)) ||
            (m.genre_tags?.includes(t as never))
        )
      )
      .slice(0, limit);
  }
  if (tags.length === 0) return [];
  const supabase = await createClient();
  // Either industry or genre overlap — Supabase 의 `overlaps` 연산자 사용
  const { data } = await supabase
    .from("models")
    .select("id, name, concept_image, base_price, is_exclusive_available, industry_tags, genre_tags, mood_tags, status, follower_count, debut_date, slug, bio, personality, instagram_handle, exclusive_price, created_at, updated_at")
    .eq("status", "active")
    .neq("id", model.id)
    .or(
      `industry_tags.ov.{${tags.join(",")}},genre_tags.ov.{${tags.join(",")}}`
    )
    .order("follower_count", { ascending: false })
    .limit(limit);
  return (data as Model[]) ?? [];
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { id } = await params;
  const { model } = await fetchModel(id);
  if (!model) {
    return { title: "모델을 찾을 수 없습니다 — Virtual Agency" };
  }
  const description =
    model.bio?.slice(0, 160) ??
    `Virtual Agency 의 AI 버추얼 모델 ${model.name}`;
  // Prefer the dynamic OG endpoint — gives a branded 1200×630 card with name,
  // price and tags rather than the bare concept image.
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://virtual-agency-murex.vercel.app";
  const ogImage = `${siteUrl}/api/og?model=${encodeURIComponent(model.id)}`;
  return {
    title: `${model.name} — Virtual Agency`,
    description,
    openGraph: {
      title: `${model.name} — Virtual Agency`,
      description,
      images: [ogImage],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: model.name,
      description,
      images: [ogImage],
    },
  };
}

export default async function ShowcaseModelPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const { model, files } = await fetchModel(id);
  if (!model) notFound();

  const m = model;
  // Fire-and-forget — don't block render on the view insert.
  void trackModelView(m.id);
  const [similar, reviews] = await Promise.all([
    fetchSimilarModels(m),
    fetchApprovedReviews(m.id),
  ]);
  const aggregate = aggregateApproved(
    reviews.map((r) => ({ rating: r.rating, status: "approved" as const }))
  );

  const debutDate = m.debut_date ? new Date(m.debut_date) : null;
  const ageYears = ageInYears(m.debut_date);

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://virtual-agency-murex.vercel.app";
  const offer = modelOfferLd(m);
  const ldGraph = [
    modelPersonLd(
      m,
      aggregate
        ? { ratingValue: aggregate.rating_value, reviewCount: aggregate.rating_count }
        : undefined
    ),
    breadcrumbLd([
      { name: "Catalog", url: `${siteUrl}/` },
      { name: m.name, url: `${siteUrl}/models/${m.id}` },
    ]),
    ...(offer ? [offer] : []),
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript({ "@graph": ldGraph }) }}
      />
      <header className="border-b border-zinc-900 px-8 py-5">
        <Link href="/" className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300">
          Virtual Agency
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Left: main image */}
          <div>
            {m.concept_image ? (
              <div className="aspect-[3/4] relative rounded-2xl overflow-hidden bg-zinc-900">
                <Image src={m.concept_image} alt={m.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="aspect-[3/4] rounded-2xl bg-zinc-900" />
            )}
          </div>

          {/* Right: info */}
          <div className="py-4">
            <h1 className="text-4xl font-bold mb-2">{m.name}</h1>

            {ageYears !== null && (
              <p className="text-zinc-400 mb-4">생체나이 {ageYears}세 · 데뷔 {debutDate?.getFullYear()}</p>
            )}

            <div className="flex items-center gap-4 mb-6 py-4 border-y border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500">팔로워</p>
                <p className="font-semibold">{(m.follower_count ?? 0).toLocaleString()}</p>
              </div>
              {m.base_price && (
                <div>
                  <p className="text-xs text-zinc-500">기본 단가</p>
                  <p className="font-semibold">₩{m.base_price.toLocaleString()} / 일</p>
                </div>
              )}
              <div>
                <p className="text-xs text-zinc-500">독점</p>
                <p className="font-semibold">{m.is_exclusive_available ? "가능" : "불가"}</p>
              </div>
              {m.instagram_handle && (
                <div>
                  <p className="text-xs text-zinc-500">Instagram</p>
                  <a
                    href={`https://www.instagram.com/${m.instagram_handle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-zinc-200 hover:text-white underline underline-offset-2 decoration-zinc-700"
                  >
                    @{m.instagram_handle.replace(/^@/, "")}
                  </a>
                </div>
              )}
            </div>

            {m.bio && (
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">{m.bio}</p>
            )}

            <div className="space-y-3 mb-8">
              {(m.industry_tags?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">산업</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.industry_tags.map((t) => (
                      <Badge key={t} variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs">
                        {INDUSTRY_LABELS[t] ?? t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {(m.genre_tags?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">장르</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.genre_tags.map((t) => (
                      <Badge key={t} variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs">
                        {GENRE_LABELS[t] ?? t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {(m.mood_tags?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">분위기</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.mood_tags.map((t) => (
                      <Badge key={t} variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs">
                        {MOOD_LABELS[t] ?? t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <PriceCalculator
              modelId={m.id}
              modelName={m.name}
              basePrice={m.base_price ?? null}
              exclusivePrice={m.exclusive_price ?? null}
              exclusiveAvailable={m.is_exclusive_available ?? false}
            />

            <div id="inquire-anchor" className="mt-6">
              <InquiryForm modelId={m.id} modelName={m.name} />
            </div>
          </div>
        </div>

        {/* Portfolio grid */}
        {files && files.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-semibold mb-6">Portfolio</h2>
            <PortfolioGallery
              images={files.map((f) => ({ id: f.id, url: f.url }))}
            />
          </div>
        )}

        {/* Approved reviews — social proof */}
        {aggregate && reviews.length > 0 && (
          <ReviewList
            reviews={reviews}
            ratingValue={aggregate.rating_value}
            ratingCount={aggregate.rating_count}
          />
        )}

        {/* Similar models — discovery boost */}
        {similar.length > 0 && (
          <div className="mt-16 pt-12 border-t border-zinc-900">
            <h2 className="text-xl font-semibold mb-6">유사한 모델</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((sm) => (
                <Link
                  key={sm.id}
                  href={`/models/${sm.id}`}
                  className="group block"
                >
                  <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-zinc-900 mb-2">
                    {sm.concept_image && (
                      <Image
                        src={sm.concept_image}
                        alt={sm.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        unoptimized
                      />
                    )}
                  </div>
                  <p className="text-sm font-medium group-hover:text-zinc-300">
                    {sm.name}
                  </p>
                  {sm.base_price && (
                    <p className="text-xs text-zinc-500">
                      ₩{sm.base_price.toLocaleString()} / 일
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
