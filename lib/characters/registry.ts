/**
 * Static character registry — Virtual Agency's owned K-aesthetic talent IP.
 *
 * Phase 1 of the global plan (k_aesthetic_global_plan.md §1.1): two named
 * characters carry the K-aesthetic moat that NL/US competitors cannot
 * replicate authentically. Each character is described as a brand asset
 * here (lore, persona, target verticals) — the actual model_id linkage to
 * `models` table rows is established once production assets land.
 *
 * Adding a third character: append a new entry below. /en/character/[slug]
 * picks up the slug automatically via generateStaticParams.
 */

export type CharacterSlug = "yuna" | "ren";
export type CharacterGender = "female" | "male" | "non-binary";

export interface CharacterAesthetic {
  /** Lighting recipe favorited for this character (Wave 93 glass-skin post). */
  lighting: string;
  /** Color palette anchors. */
  palette: string[];
  /** Wardrobe register the brand bible defaults to. */
  wardrobe: string;
}

export interface Character {
  slug: CharacterSlug;
  name: string;
  /** One-line tag shown beside the name on landing pages. */
  tagline: string;
  /** Long-form lore — read by /en/character/[slug] and used for press. */
  lore: string;
  age: number;
  gender: CharacterGender;
  /** Brief persona description that captures the talent's brand voice. */
  persona: string;
  aesthetic: CharacterAesthetic;
  /** Industries this character was built to anchor. Matches IndustryTag. */
  targetVerticals: string[];
  /** Stock moods on the model card (matches MoodTag). */
  defaultMoods: string[];
  /** Instagram handle — null until the account ships. */
  instagram: string | null;
  /**
   * Linked model_id in the `models` table once production assets render.
   * Until then we render the character page from this registry alone so
   * the brand IP is discoverable before the catalog model exists.
   */
  modelId: string | null;
  /** Year the character was introduced — shown in press copy. */
  introducedAt: string;
  /** Optional licensing note (e.g. "Category exclusivity available"). */
  licensingNote: string;
}

export const CHARACTERS: Character[] = [
  {
    slug: "yuna",
    name: "Yuna",
    tagline: "Cool minimalist Seoul editorial",
    lore: `Yuna is a 24-year-old fictional K-aesthetic talent built for global beauty, fashion-tech, and editorial brands tapping the Seoul visual register. She reads cool, soft-feature, and dewy — a face that translates across markets without feeling like a costume of any one. Brands work with Yuna when they want the K-aesthetic visual cue but a face that lives comfortably in New York, Berlin, or Singapore campaign rotation.`,
    age: 24,
    gender: "female",
    persona:
      "Quiet confidence, low-ceremony beauty look, calm editorial range. Reads minimalist + premium + restrained.",
    aesthetic: {
      lighting:
        "Soft glass-skin key (5500K, cool tint), neutral fill, warm rim. See the glass-skin post for the recipe.",
      palette: ["soft black", "ash gray", "cream", "wine-red accent"],
      wardrobe:
        "Oversized cream wool coats, slim trousers, single anchor color per look. Modern Seoul street register.",
    },
    targetVerticals: ["beauty", "luxury", "tech", "lifestyle"],
    defaultMoods: ["cold", "neutral"],
    instagram: null,
    modelId: null,
    introducedAt: "2026",
    licensingNote:
      "Category exclusivity available per quarter — typical for ambassador-style brand kits.",
  },
  {
    slug: "ren",
    name: "Ren",
    tagline: "K-pop visual register for fragrance & watches",
    lore: `Ren is a 26-year-old fictional K-aesthetic male talent. He carries the K-pop visual register — strong jawline, sharp eye, editorial restraint — without being a literal K-pop reference. Built for global fragrance, watch, fashion, and motorsport campaigns. Ren is the male anchor to Yuna's editorial palette and the two are designed to share a styling DNA so a brand kit can use either or both across a season.`,
    age: 26,
    gender: "male",
    persona:
      "Composed, slightly cinematic. Reads sharp, premium, masculine without aggressive. Carries weight in fragrance, watches, and luxury menswear.",
    aesthetic: {
      lighting:
        "Slightly directional cool key, deeper shadow fall, warm rim. Pull-toward-noir without the contrast crush.",
      palette: ["deep navy", "graphite", "warm tan accent", "ivory"],
      wardrobe:
        "Tailored coats, structured shirting, gender-fluid styling without performative androgyny.",
    },
    targetVerticals: ["luxury", "lifestyle", "tech"],
    defaultMoods: ["cold", "edgy"],
    instagram: null,
    modelId: null,
    introducedAt: "2026",
    licensingNote:
      "Pairs with Yuna for couples / multi-face brand kits. Category exclusivity available.",
  },
];

export function getCharacter(slug: string): Character | undefined {
  return CHARACTERS.find((c) => c.slug === slug);
}

export function listCharacters(): Character[] {
  return CHARACTERS;
}
