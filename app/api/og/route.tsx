import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("model");
  const model = await loadModel(id);

  const baseStyle = {
    width: "100%",
    height: "100%",
    display: "flex",
    background: "linear-gradient(135deg, #0a0a0a 0%, #18181b 100%)",
    color: "white",
    fontFamily: "sans-serif",
  } as const;

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
