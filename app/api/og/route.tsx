import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import { getPostBySlug } from "@/lib/blog/posts";
import { INDUSTRY_LABELS, MOOD_LABELS, GENRE_LABELS } from "@/lib/tags";
import type { Model } from "@/types";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * Dynamic Open Graph image — /api/og?model=<id>
 *
 * Renders a 1200×630 social card for a single model so SNS shares get a rich
 * thumbnail with name + price + tags + concept image. Falls back to a generic
 * Virtual Agency card when ?model is missing or the model can't be loaded.
 */
// Defensive id check — `?model=…` is user-controlled. The DB layer will treat
// any string as an id, so we reject obviously-bogus values up front to keep
// abuse cheap (no 1MB ids, no characters that suggest SQL/PostgREST mischief).
const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

async function loadModel(id: string | null): Promise<Model | null> {
  if (!id || !ID_RE.test(id)) return null;
  try {
    if (!SUPABASE_CONFIGURED) {
      const dev = devModelStore.get(id);
      return dev ? (dev as Model) : null;
    }
    const supabase = await createClient();
    const { data } = await supabase
      .from("models")
      .select(
        "id, name, base_price, concept_image, industry_tags, mood_tags, bio"
      )
      .eq("id", id)
      .single();
    return (data as Model | null) ?? null;
  } catch (e) {
    // Never let a DB blip leak into the OG response — fall back to the
    // generic card so social shares don't return broken images.
    console.error("[og] loadModel failed:", e);
    return null;
  }
}

const KRW = new Intl.NumberFormat("ko-KR");

function bigCard(eyebrow: string, title: string, lede: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 72,
          flexDirection: "column",
          justifyContent: "center",
          gap: 18,
          background: "linear-gradient(135deg, #0a0a0a 0%, #18181b 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <p style={{ fontSize: 18, letterSpacing: "0.4em", color: "#a1a1aa" }}>
          {eyebrow}
        </p>
        <p style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>
          {title}
        </p>
        <p style={{ fontSize: 22, color: "#a1a1aa", lineHeight: 1.4 }}>{lede}</p>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("model");
  const blogSlug = searchParams.get("blog");
  const isCases = searchParams.get("cases") === "1";
  const exploreIndustry = searchParams.get("explore_industry");
  const exploreMood = searchParams.get("explore_mood");
  const exploreGenre = searchParams.get("explore_genre");

  // Static-card surfaces first — these never need a DB read.
  if (isCases) {
    return bigCard(
      "VIRTUAL AGENCY · CASES",
      "실제 납품 사례",
      "광고주 사명은 anonymized. 산업·납기·모델은 실제 데이터입니다."
    );
  }
  if (exploreIndustry && INDUSTRY_LABELS[exploreIndustry]) {
    return bigCard(
      "VIRTUAL AGENCY · EXPLORE",
      `${INDUSTRY_LABELS[exploreIndustry]} 캠페인 모델`,
      "이 산업에 특화된 AI 버추얼 모델을 둘러보세요."
    );
  }
  if (exploreMood && MOOD_LABELS[exploreMood]) {
    return bigCard(
      "VIRTUAL AGENCY · MOOD",
      `${MOOD_LABELS[exploreMood]} 분위기의 모델`,
      "무드에 맞춰 캐스팅된 AI 버추얼 모델 카탈로그."
    );
  }
  if (exploreGenre && GENRE_LABELS[exploreGenre]) {
    return bigCard(
      "VIRTUAL AGENCY · GENRE",
      `${GENRE_LABELS[exploreGenre]} 비주얼의 모델`,
      "장르 톤에 어울리는 AI 버추얼 모델 카탈로그."
    );
  }

  const baseStyle = {
    width: "100%",
    height: "100%",
    display: "flex",
    background: "linear-gradient(135deg, #0a0a0a 0%, #18181b 100%)",
    color: "white",
    fontFamily: "sans-serif",
  } as const;

  // Blog post card — shown when ?blog=<slug>. Falls through to the generic
  // card when the slug doesn't resolve, so a stale URL still renders.
  if (blogSlug) {
    const post = /^[a-z0-9-]{1,128}$/.test(blogSlug)
      ? getPostBySlug(blogSlug)
      : undefined;
    if (post) {
      return new ImageResponse(
        (
          <div style={{ ...baseStyle, padding: 72, flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 18, letterSpacing: "0.4em", color: "#a1a1aa" }}>
                VIRTUAL AGENCY · BLOG
              </p>
              <p style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.1 }}>
                {post.title}
              </p>
              <p style={{ fontSize: 22, color: "#a1a1aa", lineHeight: 1.4 }}>
                {post.excerpt.slice(0, 180)}
                {post.excerpt.length > 180 ? "…" : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {post.tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    color: "#e4e4e7",
                    fontSize: 18,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }
  }

  const model = await loadModel(id);

  if (!model) {
    return new ImageResponse(
      (
        <div style={baseStyle}>
          <div
            style={{
              margin: "auto",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <p style={{ fontSize: 18, letterSpacing: "0.4em", color: "#a1a1aa" }}>
              VIRTUAL AGENCY
            </p>
            <p style={{ fontSize: 72, fontWeight: 800, lineHeight: 1 }}>
              AI Virtual Models
            </p>
            <p style={{ fontSize: 22, color: "#a1a1aa", marginTop: 12 }}>
              실제보다 완벽한. 광고에 최적화된 버추얼 모델.
            </p>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const tags = [...(model.industry_tags ?? []), ...(model.mood_tags ?? [])]
    .slice(0, 4);

  return new ImageResponse(
    (
      <div style={baseStyle}>
        {/* Left: photo */}
        <div
          style={{
            width: 500,
            height: 630,
            background: "#27272a",
            display: "flex",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {model.concept_image && (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              src={model.concept_image}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>

        {/* Right: text */}
        <div
          style={{
            flex: 1,
            padding: "56px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 14, letterSpacing: "0.4em", color: "#71717a" }}>
              VIRTUAL AGENCY
            </p>
            <p style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>
              {model.name}
            </p>
            {model.bio && (
              <p
                style={{
                  fontSize: 18,
                  color: "#a1a1aa",
                  lineHeight: 1.4,
                  marginTop: 12,
                  // ImageResponse doesn't support line-clamp; trim manually.
                  whiteSpace: "pre-wrap",
                }}
              >
                {model.bio.slice(0, 110)}
                {model.bio.length > 110 ? "…" : ""}
              </p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tags.length > 0 && (
              <div style={{ display: "flex", gap: 8 }}>
                {tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.08)",
                      color: "#e4e4e7",
                      fontSize: 16,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {model.base_price && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 14, color: "#71717a" }}>FROM</span>
                <span style={{ fontSize: 36, fontWeight: 700 }}>
                  ₩{KRW.format(model.base_price)}
                </span>
                <span style={{ fontSize: 16, color: "#a1a1aa" }}>/ 일</span>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
