import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import { getPostBySlug, listPostsByTag } from "@/lib/blog/posts";
import { INDUSTRY_LABELS, MOOD_LABELS, GENRE_LABELS } from "@/lib/tags";
import { getCharacter } from "@/lib/characters/registry";
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
  const blogTag = searchParams.get("blog_tag");
  const isCases = searchParams.get("cases") === "1";
  const isCareers = searchParams.get("careers") === "1";
  const isServices = searchParams.get("services") === "1";
  const isPricing = searchParams.get("pricing") === "1";
  const isFaq = searchParams.get("faq") === "1";
  const isPress = searchParams.get("press") === "1";
  const isMatch = searchParams.get("match") === "1";
  const isTrending = searchParams.get("trending") === "1";
  const isAbout = searchParams.get("about") === "1";
  const exploreIndustry = searchParams.get("explore_industry");
  const exploreMood = searchParams.get("explore_mood");
  const exploreGenre = searchParams.get("explore_genre");

  // English (Phase 0 global rollout) — separate from KR variants so the
  // OG card copy can be tuned to global brand voice without being a literal
  // translation of the Korean cards.
  const isEnHome = searchParams.get("en") === "1";
  const isEnPricing = searchParams.get("en_pricing") === "1";
  const isEnAbout = searchParams.get("en_about") === "1";
  const isEnServices = searchParams.get("en_services") === "1";
  const isEnCases = searchParams.get("en_cases") === "1";
  const isEnBlog = searchParams.get("en_blog") === "1";
  const isEnFaq = searchParams.get("en_faq") === "1";
  const isEnAiDisclosure = searchParams.get("en_ai_disclosure") === "1";
  const isEnMatch = searchParams.get("en_match") === "1";
  const isEnRfp = searchParams.get("en_rfp") === "1";
  const isEnPress = searchParams.get("en_press") === "1";
  const enBlogTag = searchParams.get("en_blog_tag");
  const enCharacter = searchParams.get("en_character");
  const enCharacterBrandKits = searchParams.get("en_character_brand_kits") === "1";
  const character = searchParams.get("character");
  const characterBrandKits = searchParams.get("character_brand_kits") === "1";
  const isEnCharacters = searchParams.get("en_characters") === "1";
  const isCharacters = searchParams.get("characters") === "1";
  const isEnCharacterCompare = searchParams.get("en_character_compare") === "1";
  const isCharacterCompare = searchParams.get("character_compare") === "1";
  const isGlossary = searchParams.get("glossary") === "1";
  const isEnGlossary = searchParams.get("en_glossary") === "1";

  if (isEnHome) {
    return bigCard(
      "VIRTUAL AGENCY",
      "K-Aesthetic AI Models for Global Brands",
      "Cast in 24h, deliver in days, license per campaign. Synthetic talent built for global K-aesthetic."
    );
  }
  if (isEnPricing) {
    return bigCard(
      "VIRTUAL AGENCY · PRICING",
      "One day. One model. One license.",
      "From $300/day base to $25K/quarter brand kits. Stripe billing in USD, EUR, SGD, GBP."
    );
  }
  if (isEnAbout) {
    return bigCard(
      "VIRTUAL AGENCY · ABOUT",
      "A production studio for K-aesthetic talent",
      "End-to-end pipeline on our own GPUs. Synthetic by default, with operational depth global brands recognize."
    );
  }
  if (isEnServices) {
    return bigCard(
      "VIRTUAL AGENCY · SERVICES",
      "Five services, one studio",
      "Image · video · lookbook · fitting day · brand model kit. Same continuity layer across all."
    );
  }
  if (isEnCases) {
    return bigCard(
      "VIRTUAL AGENCY · CASES",
      "Anchor case studies — recruiting now",
      "K-beauty US, K-pop merch US, K-aesthetic EU. Discounted slots for the first three brands."
    );
  }
  if (isEnBlog) {
    return bigCard(
      "VIRTUAL AGENCY · BLOG",
      "Notes on K-aesthetic and synthetic talent",
      "What K-aesthetic actually means · how to brief for it · what it costs vs traditional models."
    );
  }
  if (isEnFaq) {
    return bigCard(
      "VIRTUAL AGENCY · FAQ",
      "Frequently asked, globally answered",
      "Licensing, pricing, turnaround, compliance, cross-market use — answered for global brands."
    );
  }
  if (isEnAiDisclosure) {
    return bigCard(
      "VIRTUAL AGENCY · COMPLIANCE",
      "AI synthetic content disclosure",
      "EU AI Act Article 50 · US FTC · UK ASA · Korea KCSC. The full posture, per market."
    );
  }
  if (isEnMatch) {
    return bigCard(
      "VIRTUAL AGENCY · MATCH",
      "AI model matching for global campaigns",
      "Describe your brief — industry, mood, day rate. We surface the K-aesthetic models that fit."
    );
  }
  if (isEnRfp) {
    return bigCard(
      "VIRTUAL AGENCY · RFP",
      "Request for Proposal — print-ready",
      "One-page RFP with matched models, USD budget bands, and licensing terms. PDF in one click."
    );
  }
  if (isEnPress) {
    return bigCard(
      "VIRTUAL AGENCY · PRESS",
      "Press kit for global media",
      "Stats, logos, one-line and long-form bios, media contact. Cleared for editorial use."
    );
  }
  if (enBlogTag) {
    const safeTag = enBlogTag.slice(0, 40);
    const matches = listPostsByTag(safeTag, "en");
    if (matches.length > 0) {
      return bigCard(
        "VIRTUAL AGENCY · BLOG",
        `#${safeTag}`,
        `${matches.length} post${matches.length === 1 ? "" : "s"} · ${matches
          .slice(0, 2)
          .map((p) => p.title)
          .join(" · ")}`
      );
    }
  }
  if (enCharacter) {
    const c = getCharacter(enCharacter);
    if (c) {
      return bigCard(
        `VIRTUAL AGENCY · CHARACTER`,
        c.name,
        `${c.tagline} · Built for ${c.targetVerticals.slice(0, 3).join(", ")}.`
      );
    }
  }
  if (enCharacterBrandKits) {
    return bigCard(
      "VIRTUAL AGENCY · BRAND KITS",
      "Cast the pair, license the season",
      "Yuna + Ren — paired K-aesthetic brand kits at $8.5K · $22K · $50K+ per quarter. Category exclusivity available."
    );
  }
  if (isEnCharacters) {
    return bigCard(
      "VIRTUAL AGENCY · CHARACTERS",
      "Owned K-aesthetic talent",
      "Yuna and Ren — synthetic K-aesthetic faces designed to anchor brand campaigns across markets."
    );
  }
  if (isEnCharacterCompare) {
    return bigCard(
      "VIRTUAL AGENCY · COMPARE",
      "Yuna vs Ren — pick your face",
      "Persona, lighting, palette, target verticals side by side. The reference for deciding between solo casting and a paired brand kit."
    );
  }
  if (isEnGlossary) {
    return bigCard(
      "VIRTUAL AGENCY · GLOSSARY",
      "K-aesthetic & synthetic talent — 14 terms",
      "Glass skin, styling DNA, brand kit, disclosure metadata, category exclusivity. The vocabulary that buyers and compliance reviewers actually use."
    );
  }

  // Static-card surfaces first — these never need a DB read.
  if (blogTag) {
    // Tag string is user-controlled — cap length and skip rendering if it
    // resolves to no posts (avoids spam-generated cards for fake tags).
    const safeTag = blogTag.slice(0, 40);
    const matches = listPostsByTag(safeTag);
    if (matches.length > 0) {
      return bigCard(
        "VIRTUAL AGENCY · BLOG",
        `#${safeTag}`,
        `${matches.length}개의 글 · ${matches
          .slice(0, 2)
          .map((p) => p.title)
          .join(" · ")}`
      );
    }
  }
  if (isCases) {
    return bigCard(
      "VIRTUAL AGENCY · CASES",
      "실제 납품 사례",
      "광고주 사명은 anonymized. 산업·납기·모델은 실제 데이터입니다."
    );
  }
  if (isCareers) {
    return bigCard(
      "VIRTUAL AGENCY · CAREERS",
      "크리에이터로 합류",
      "자체 제작한 AI 버추얼 모델을 광고 캠페인 자산으로. 정산 70%."
    );
  }
  if (isServices) {
    return bigCard(
      "VIRTUAL AGENCY · SERVICES",
      "5가지 핵심 서비스",
      "이미지 · 영상 · 룩북 · 픽업 데이 · 브랜드 키트, 한 곳에서."
    );
  }
  if (isPricing) {
    return bigCard(
      "VIRTUAL AGENCY · PRICING",
      "투명한 가격대, 즉시 견적",
      "일수·독점·매체 범위에 따라 카탈로그에서 자동 산출. 분기 단위 묶음 할인."
    );
  }
  if (isFaq) {
    return bigCard(
      "VIRTUAL AGENCY · FAQ",
      "자주 묻는 질문",
      "AI 버추얼 모델·라이선스·납기·결제·확장 컷에 대한 답변."
    );
  }
  if (isPress) {
    return bigCard(
      "VIRTUAL AGENCY · PRESS",
      "프레스 자료 + 미디어 키트",
      "통계·로고·미디어 문의 한 곳에서. press@aihubs.uk"
    );
  }
  if (isMatch) {
    return bigCard(
      "VIRTUAL AGENCY · AI MATCH",
      "광고 컨셉으로 모델 매칭",
      "브리프 한 줄이면 OK. 산업·무드·예산을 자동 추론해 어울리는 모델을 추천합니다."
    );
  }
  if (isTrending) {
    // Personalize the trending card if the page passed an industry or mood.
    // /trending?industry=beauty shares an OG card calling out "뷰티 트렌딩 모델"
    // instead of the generic catalog headline.
    const trIndustry = searchParams.get("industry");
    const trMood = searchParams.get("mood");
    const industryLabel =
      trIndustry && INDUSTRY_LABELS[trIndustry]
        ? INDUSTRY_LABELS[trIndustry]
        : null;
    const moodLabel =
      trMood && MOOD_LABELS[trMood] ? MOOD_LABELS[trMood] : null;
    const eyebrow = "VIRTUAL AGENCY · TRENDING";
    if (industryLabel && moodLabel) {
      return bigCard(
        eyebrow,
        `${moodLabel} ${industryLabel} 트렌딩 모델`,
        "30일 페이지 뷰 기준 카탈로그 모멘텀. 산업·무드 필터 적용."
      );
    }
    if (industryLabel) {
      return bigCard(
        eyebrow,
        `${industryLabel} 트렌딩 모델`,
        "30일 페이지 뷰 기준 카탈로그 모멘텀. 산업 필터 적용."
      );
    }
    if (moodLabel) {
      return bigCard(
        eyebrow,
        `${moodLabel} 무드 트렌딩 모델`,
        "30일 페이지 뷰 기준 카탈로그 모멘텀. 무드 필터 적용."
      );
    }
    return bigCard(
      eyebrow,
      "이번 주 광고주가 가장 많이 둘러본 모델",
      "30일 페이지 뷰 기준 카탈로그 모멘텀 상위 12명. 실시간 동향 그대로 노출."
    );
  }
  if (character) {
    const c = getCharacter(character);
    if (c) {
      return bigCard(
        "VIRTUAL AGENCY · 캐릭터",
        c.name,
        `${c.tagline} · ${c.targetVerticals.slice(0, 3).join("·")} 산업 라이선스.`
      );
    }
  }
  if (characterBrandKits) {
    return bigCard(
      "VIRTUAL AGENCY · 브랜드 키트",
      "캐스트를 묶어서 라이선스",
      "유나 + 렌 페어 브랜드 키트 ₩11M · ₩28.5M · ₩65M부터 / 분기. 카테고리 독점 옵션."
    );
  }
  if (isCharacters) {
    return bigCard(
      "VIRTUAL AGENCY · 캐릭터",
      "자체 K-aesthetic 캐스트",
      "유나·렌 — 시즌과 시장을 가로질러 같은 얼굴로 일관된 브랜드 아이덴티티를 구축할 수 있는 합성 모델."
    );
  }
  if (isCharacterCompare) {
    return bigCard(
      "VIRTUAL AGENCY · 비교",
      "유나 vs 렌 — 한 화면에서 결정",
      "페르소나·라이팅·팔레트·산업 적합도 9 항목 비교. 솔로 캐스팅과 페어 브랜드 키트 사이의 결정 가이드."
    );
  }
  if (isGlossary) {
    return bigCard(
      "VIRTUAL AGENCY · 용어집",
      "K-aesthetic · 합성 모델 14 용어",
      "글래스 스킨, 스타일링 DNA, 브랜드 키트, 디스클로저 메타데이터, 카테고리 독점. 브리프·견적·컴플라이언스 검토 시 필요한 어휘."
    );
  }
  if (isAbout) {
    return bigCard(
      "VIRTUAL AGENCY · ABOUT",
      "AI 버추얼 모델 광고 에이전시",
      "자체 생성 인프라 + 매칭 엔진. 4원칙으로 운영하는 한국 광고 캠페인 전용 카탈로그."
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
