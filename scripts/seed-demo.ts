/**
 * Demo seed — populates `models` with 12 representative entries so a fresh
 * Supabase instance has something to show on /, /match, /compare, /admin.
 *
 * Run with: npx tsx scripts/seed-demo.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 * Safe to re-run: skips rows whose slug already exists.
 */
import { createClient } from "@supabase/supabase-js";

interface SeedModel {
  name: string;
  slug: string;
  bio: string;
  personality: string;
  industry_tags: string[];
  genre_tags: string[];
  mood_tags: string[];
  base_price: number;
  exclusive_price: number;
  is_exclusive_available: boolean;
  follower_count: number;
  concept_image: string;
  status: "active";
}

const seed = (i: number): string =>
  `https://picsum.photos/seed/va-${i}/600/800`;

const MODELS: SeedModel[] = [
  {
    name: "Aria",
    slug: "aria",
    bio: "도시적이고 차가운 인상, 럭셔리 광고에 최적화.",
    personality: "cold, refined, editorial",
    industry_tags: ["luxury", "beauty"],
    genre_tags: ["ad", "film"],
    mood_tags: ["cold", "edgy"],
    base_price: 800_000,
    exclusive_price: 3_500_000,
    is_exclusive_available: true,
    follower_count: 132_000,
    concept_image: seed(1),
    status: "active",
  },
  {
    name: "Luna",
    slug: "luna",
    bio: "따뜻한 미소, 테크·라이프스타일 캠페인에 적합.",
    personality: "warm, approachable",
    industry_tags: ["tech", "lifestyle"],
    genre_tags: ["ad"],
    mood_tags: ["warm"],
    base_price: 450_000,
    exclusive_price: 1_800_000,
    is_exclusive_available: false,
    follower_count: 280_000,
    concept_image: seed(2),
    status: "active",
  },
  {
    name: "Soren",
    slug: "soren",
    bio: "스포츠웨어·아웃도어 광고에 강한 강한 인상.",
    personality: "intense, athletic",
    industry_tags: ["sports", "lifestyle"],
    genre_tags: ["ad"],
    mood_tags: ["edgy"],
    base_price: 600_000,
    exclusive_price: 2_400_000,
    is_exclusive_available: true,
    follower_count: 95_000,
    concept_image: seed(3),
    status: "active",
  },
  {
    name: "Mika",
    slug: "mika",
    bio: "푸드·F&B 캠페인을 위한 친근한 모델.",
    personality: "playful, friendly",
    industry_tags: ["food", "lifestyle"],
    genre_tags: ["ad"],
    mood_tags: ["warm"],
    base_price: 350_000,
    exclusive_price: 1_200_000,
    is_exclusive_available: true,
    follower_count: 50_000,
    concept_image: seed(4),
    status: "active",
  },
  {
    name: "Hana",
    slug: "hana",
    bio: "로맨스·드라마에 어울리는 부드러운 톤.",
    personality: "soft, sincere",
    industry_tags: ["beauty", "lifestyle"],
    genre_tags: ["romance", "drama"],
    mood_tags: ["warm", "neutral"],
    base_price: 500_000,
    exclusive_price: 2_000_000,
    is_exclusive_available: true,
    follower_count: 210_000,
    concept_image: seed(5),
    status: "active",
  },
  {
    name: "Rin",
    slug: "rin",
    bio: "사이파이·미래적 룩, 테크 광고에 강함.",
    personality: "futuristic, sharp",
    industry_tags: ["tech", "luxury"],
    genre_tags: ["sci-fi", "ad"],
    mood_tags: ["cold", "edgy"],
    base_price: 750_000,
    exclusive_price: 3_000_000,
    is_exclusive_available: true,
    follower_count: 178_000,
    concept_image: seed(6),
    status: "active",
  },
  {
    name: "Yul",
    slug: "yul",
    bio: "독립 영화·아트하우스 톤.",
    personality: "introspective",
    industry_tags: ["lifestyle"],
    genre_tags: ["indie", "noir"],
    mood_tags: ["cold", "neutral"],
    base_price: 400_000,
    exclusive_price: 1_500_000,
    is_exclusive_available: false,
    follower_count: 42_000,
    concept_image: seed(7),
    status: "active",
  },
  {
    name: "Eve",
    slug: "eve",
    bio: "럭셔리 뷰티, 에디토리얼 화보.",
    personality: "regal, distant",
    industry_tags: ["beauty", "luxury"],
    genre_tags: ["ad"],
    mood_tags: ["cold"],
    base_price: 900_000,
    exclusive_price: 4_000_000,
    is_exclusive_available: true,
    follower_count: 305_000,
    concept_image: seed(8),
    status: "active",
  },
  {
    name: "Joon",
    slug: "joon",
    bio: "사극·전통 콘텐츠에 적합.",
    personality: "stoic, classical",
    industry_tags: ["lifestyle"],
    genre_tags: ["historical", "drama"],
    mood_tags: ["neutral"],
    base_price: 380_000,
    exclusive_price: 1_400_000,
    is_exclusive_available: true,
    follower_count: 38_000,
    concept_image: seed(9),
    status: "active",
  },
  {
    name: "Cleo",
    slug: "cleo",
    bio: "공포·호러 장르에서 인상적인 룩.",
    personality: "mysterious",
    industry_tags: ["lifestyle"],
    genre_tags: ["horror", "film"],
    mood_tags: ["cold", "edgy"],
    base_price: 420_000,
    exclusive_price: 1_700_000,
    is_exclusive_available: false,
    follower_count: 60_000,
    concept_image: seed(10),
    status: "active",
  },
  {
    name: "Nova",
    slug: "nova",
    bio: "광고·SNS 콘텐츠 다재다능형.",
    personality: "versatile, bright",
    industry_tags: ["beauty", "tech", "lifestyle"],
    genre_tags: ["ad"],
    mood_tags: ["warm", "neutral"],
    base_price: 550_000,
    exclusive_price: 2_200_000,
    is_exclusive_available: true,
    follower_count: 415_000,
    concept_image: seed(11),
    status: "active",
  },
  {
    name: "Iris",
    slug: "iris",
    bio: "고감도 패션·뷰티 화보 톤.",
    personality: "high-fashion",
    industry_tags: ["beauty", "luxury"],
    genre_tags: ["ad", "film"],
    mood_tags: ["edgy"],
    base_price: 850_000,
    exclusive_price: 3_400_000,
    is_exclusive_available: true,
    follower_count: 260_000,
    concept_image: seed(12),
    status: "active",
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  let inserted = 0;
  let skipped = 0;
  for (const m of MODELS) {
    const { data: existing } = await supabase
      .from("models")
      .select("id")
      .eq("slug", m.slug)
      .maybeSingle();
    if (existing) {
      skipped++;
      continue;
    }
    const { error } = await supabase.from("models").insert(m);
    if (error) {
      console.error(`✗ ${m.name}: ${error.message}`);
      continue;
    }
    console.log(`✓ ${m.name}`);
    inserted++;
  }

  console.log(`\nDone — inserted ${inserted}, skipped ${skipped}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
