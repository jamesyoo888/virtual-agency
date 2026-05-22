/**
 * k-fortune character archetype library — 42 entries.
 *
 *   32 COSMOS Code archetypes (primary identity layer, 5-axis)
 *   10 Day-master archetypes (elemental, 10 heavenly stems)
 *
 * The 15 dispositional axes (Peer / Rival / Tree / Flame …) are surfaced as
 * small text chips in the product, not hero art, so they are out of scope here.
 *
 * Each entry composes into a full prompt via `buildPrompt()` — a shared style
 * spine (proven on the v6 "The Voice" render) plus per-archetype subject /
 * pose / wardrobe / prop / palette. Seeds are fixed so re-runs reproduce.
 */

export interface Archetype {
  slug: string;
  name: string;
  system: "cosmos" | "daymaster";
  code: string; // COSMOS 5-letter code, or heavenly stem
  subject: string; // gender + age
  pose: string;
  wardrobe: string;
  prop: string;
  palette: string;
  seed: number;
  expression?: string; // optional override of DEFAULT_EXPRESSION
}

const STYLE_PREFIX =
  "Cinematic stylized 3D animation character portrait in modern feature-film quality.";

const STYLE_SUFFIX =
  "Background: cosmos-purple to deep-navy radial gradient with faint pinpoint stars, shallow depth of field. Cinematic three-point lighting, stylized PBR materials, soft realistic skin shader, hair with natural physics. Single hero character centered, three-quarter angle, portrait orientation, 4k cinematic studio render.";

const DEFAULT_EXPRESSION =
  "calm assured composure, an intelligent focused gaze and a subtle confident expression, not theatrical and not wide-eyed";

export function buildPrompt(a: Archetype): string {
  const expr = a.expression ?? DEFAULT_EXPRESSION;
  return `${STYLE_PREFIX} "${a.name}" — a ${a.subject} with main-character presence and ${expr}. ${a.pose}. Wears ${a.wardrobe}. ${a.prop}, lit with ${a.palette} accent lighting. ${STYLE_SUFFIX}`;
}

// ---------------------------------------------------------------------------
// 32 COSMOS Code archetypes
// ---------------------------------------------------------------------------

const COSMOS: Archetype[] = [
  {
    slug: "the-captain", name: "The Captain", system: "cosmos", code: "SOLPC",
    subject: "man in his late 40s", seed: 100101,
    pose: "standing in a commanding upright stance, one hand extended forward as if setting a course",
    wardrobe: "a structured deep-navy commander's coat with subtle brass detailing",
    prop: "a glowing navigational compass hovering above his open palm",
    palette: "deep navy and warm brass-gold",
  },
  {
    slug: "the-pioneer", name: "The Pioneer", system: "cosmos", code: "SOLPB",
    subject: "young woman in her late 20s", seed: 100102,
    pose: "mid-stride stepping forward, gaze lifted toward a distant horizon",
    wardrobe: "a rugged layered explorer's jacket with rolled sleeves",
    prop: "holding a small glowing lantern that lights the path ahead",
    palette: "terracotta and dawn gold",
  },
  {
    slug: "the-authority", name: "The Authority", system: "cosmos", code: "SOLUC",
    subject: "man in his early 50s", seed: 100103,
    pose: "standing tall and composed, hands resting calmly, an unmistakable air of legitimacy",
    wardrobe: "a formal tailored burgundy coat with crisp lines",
    prop: "a tall ceremonial staff of light held at his side",
    palette: "deep burgundy and gold",
  },
  {
    slug: "the-maverick", name: "The Maverick", system: "cosmos", code: "SOLUB",
    subject: "young woman in her late 20s", seed: 100104,
    pose: "leaning casually with arms loosely crossed, a knowing half-smile",
    wardrobe: "a worn charcoal leather jacket over a graphic tee",
    prop: "an electric-red glow tracing the edge of her silhouette",
    palette: "charcoal and electric red",
    expression: "a relaxed rebellious confidence, one eyebrow subtly raised",
  },
  {
    slug: "the-sovereign", name: "The Sovereign", system: "cosmos", code: "SOQPC",
    subject: "woman in her early 50s", seed: 100105,
    pose: "perfectly still with quiet regal command, chin level, shoulders open",
    wardrobe: "an understated regal gown-coat in deep purple",
    prop: "a faint crown of light resting just above her head",
    palette: "deep royal purple and gold",
  },
  {
    slug: "the-adventurer", name: "The Adventurer", system: "cosmos", code: "SOQPB",
    subject: "young man in his mid-20s", seed: 100106,
    pose: "caught mid-step on a trail, calm and focused, ready for the next ridge",
    wardrobe: "practical travel gear with a worn canvas pack",
    prop: "a small brass compass glowing softly in his hand",
    palette: "forest green and amber",
  },
  {
    slug: "the-stoic", name: "The Stoic", system: "cosmos", code: "SOQUC",
    subject: "man in his early 50s", seed: 100107,
    pose: "standing grounded and unmoved, hands clasped behind the back",
    wardrobe: "a simple robust slate coat, nothing ornamental",
    prop: "still air around him, a single steady point of calm light",
    palette: "stone grey and slate blue",
    expression: "serene immovable calm, eyes settled and unhurried",
  },
  {
    slug: "the-stalwart", name: "The Stalwart", system: "cosmos", code: "SOQUB",
    subject: "young woman in her early 30s", seed: 100108,
    pose: "planted in a steady protective stance, weight low and certain",
    wardrobe: "a weathered durable iron-grey jacket",
    prop: "a faint shield of teal light forming at her forearm",
    palette: "iron grey and deep teal",
  },
  {
    slug: "the-strategist", name: "The Strategist", system: "cosmos", code: "SWLPC",
    subject: "young woman in her early 30s", seed: 100109,
    pose: "turned slightly inward, one hand gesturing as if arranging an unseen plan",
    wardrobe: "a sharp tailored vest over a crisp shirt",
    prop: "small glowing geometric strategy pieces floating around her hand",
    palette: "navy and cool silver",
  },
  {
    slug: "the-builder", name: "The Builder", system: "cosmos", code: "SWLPB",
    subject: "young man in his late 20s", seed: 100110,
    pose: "hands mid-gesture, constructing something from glowing blocks of light",
    wardrobe: "a practical maker's jacket with many pockets, sleeves pushed up",
    prop: "luminous architectural blocks assembling between his hands",
    palette: "warm orange and slate grey",
  },
  {
    slug: "the-mentor", name: "The Mentor", system: "cosmos", code: "SWLUC",
    subject: "woman in her early 50s", seed: 100111,
    pose: "turned to one side mid-explanation, one hand offering a glowing orb of knowledge",
    wardrobe: "a warm soft-brown cardigan-coat",
    prop: "a small radiant orb of light cupped in her offered palm",
    palette: "warm amber and soft brown",
    expression: "a warm patient encouragement, eyes kind and attentive",
  },
  {
    slug: "the-sage", name: "The Sage", system: "cosmos", code: "SWLUB",
    subject: "man in his late 50s", seed: 100112,
    pose: "standing calm in mid-thought, one hand resting on an open glowing book",
    wardrobe: "a deep-indigo scholar's robe-coat",
    prop: "an open book radiating soft parchment-gold light",
    palette: "deep indigo and parchment gold",
    expression: "quiet earned wisdom, a faint knowing calm",
  },
  {
    slug: "the-architect", name: "The Architect", system: "cosmos", code: "SWQPC",
    subject: "young man in his early 30s", seed: 100113,
    pose: "composing space with both hands, shaping precise glowing geometry",
    wardrobe: "a minimal precisely-cut cool-grey jacket",
    prop: "exact luminous geometric structures forming around his hands",
    palette: "cool grey and cyan",
  },
  {
    slug: "the-inventor", name: "The Inventor", system: "cosmos", code: "SWQPB",
    subject: "young woman in her late 20s", seed: 100114,
    pose: "leaning in to examine a small glowing contraption with quiet fascination",
    wardrobe: "a workshop jacket with tools tucked into the seams",
    prop: "an intricate glowing gadget turning slowly above her hands",
    palette: "copper and teal",
  },
  {
    slug: "the-guardian", name: "The Guardian", system: "cosmos", code: "SWQUC",
    subject: "man in his late 40s", seed: 100115,
    pose: "standing watchful and steady, a protective stillness in the shoulders",
    wardrobe: "a sturdy bronze-trimmed protector's coat",
    prop: "a calm shield of green light held quietly at the ready",
    palette: "deep green and bronze",
  },
  {
    slug: "the-master", name: "The Master", system: "cosmos", code: "SWQUB",
    subject: "woman in her early 50s", seed: 100116,
    pose: "in serene total composure, a small element of light moving effortlessly at her fingertips",
    wardrobe: "refined simple dark attire, quietly elegant",
    prop: "a single point of jade light orbiting her hand with no effort",
    palette: "near-black and jade",
    expression: "complete unhurried mastery, a still and certain calm",
  },
  {
    slug: "the-hustler", name: "The Hustler", system: "cosmos", code: "FOLPC",
    subject: "young man in his mid-20s", seed: 100117,
    pose: "caught in dynamic motion, energy in every line of the body",
    wardrobe: "a sharp modern streetwear-suit hybrid",
    prop: "glowing coins of opportunity-light arcing between his hands",
    palette: "vivid green and gold",
    expression: "bright restless drive, a quick confident grin",
  },
  {
    slug: "the-outsider", name: "The Outsider", system: "cosmos", code: "FOLPB",
    subject: "young woman in her late 20s", seed: 100118,
    pose: "standing alone and self-assured, apart from an unseen crowd",
    wardrobe: "a distinctive non-conformist outfit, bold and singular",
    prop: "a single soft spotlight falling on her and no one else",
    palette: "magenta and black",
  },
  {
    slug: "the-channeler", name: "The Channeler", system: "cosmos", code: "FOLUC",
    subject: "young man in his late 20s", seed: 100119,
    pose: "arms raised, conducting a current of energy that flows through the body",
    wardrobe: "flowing expressive layers that catch the moving light",
    prop: "ribbons of electric-blue energy flowing through his open hands",
    palette: "electric blue and white",
  },
  {
    slug: "the-voice", name: "The Voice", system: "cosmos", code: "FOLUB",
    subject: "young man in his mid-20s", seed: 778899,
    pose: "in a confident three-quarter pose, head tilted with self-knowing ease",
    wardrobe: "an oversized vintage denim jacket with holographic-chrome buttons, a layered silver chain over a cream tee",
    prop: "holding a vintage chrome microphone with a cyan-to-gold soundwave dissolving outward",
    palette: "cyan and gold",
  },
  {
    slug: "the-operator", name: "The Operator", system: "cosmos", code: "FOQPC",
    subject: "young woman in her early 30s", seed: 100121,
    pose: "calmly in control, hands poised over a panel of light",
    wardrobe: "a sleek functional dark-slate jacket",
    prop: "a softly glowing control interface of amber light before her",
    palette: "dark slate and amber",
  },
  {
    slug: "the-drifter", name: "The Drifter", system: "cosmos", code: "FOQPB",
    subject: "young man in his mid-20s", seed: 100122,
    pose: "relaxed and unhurried, hands in pockets, drifting easily",
    wardrobe: "casual loose layers in dusty blue",
    prop: "a single glowing paper plane gliding lazily past him",
    palette: "dusty blue and warm sand",
  },
  {
    slug: "the-receiver", name: "The Receiver", system: "cosmos", code: "FOQUC",
    subject: "young woman in her mid-20s", seed: 100123,
    pose: "open cupped hands lifted gently, receiving a soft fall of light",
    wardrobe: "soft open layers in rose and cream",
    prop: "motes of gentle light settling into her open hands",
    palette: "soft rose and cream",
    expression: "a quiet open receptivity, gaze soft and present",
  },
  {
    slug: "the-listener", name: "The Listener", system: "cosmos", code: "FOQUB",
    subject: "young man in his late 20s", seed: 100124,
    pose: "head tilted in attentive stillness, fully turned toward an unseen speaker",
    wardrobe: "cozy understated layers in muted teal",
    prop: "faint sound ripples drifting toward him through the air",
    palette: "muted teal and warm grey",
    expression: "deep attentive stillness, eyes gentle and fully present",
  },
  {
    slug: "the-witness", name: "The Witness", system: "cosmos", code: "FWLPC",
    subject: "young woman in her early 30s", seed: 100125,
    pose: "observing intently from a measured distance, noting everything",
    wardrobe: "a sharp indigo observer's coat",
    prop: "a faint pale-gold ring of light marking what she records",
    palette: "cool indigo and pale gold",
  },
  {
    slug: "the-creator", name: "The Creator", system: "cosmos", code: "FWLPB",
    subject: "young man in his mid-20s", seed: 100126,
    pose: "caught mid-creation, conjuring new form and colour from his hands",
    wardrobe: "an artist's layered outfit flecked with colour",
    prop: "a burst of prismatic light taking shape between his hands",
    palette: "prismatic rainbow against dark",
  },
  {
    slug: "the-hermit", name: "The Hermit", system: "cosmos", code: "FWLUC",
    subject: "man in his late 40s", seed: 100127,
    pose: "solitary and inward, walking quietly with a lantern",
    wardrobe: "a hooded warm cloak-jacket in deep blue",
    prop: "a single warm lantern held close in the surrounding dark",
    palette: "deep blue and candle gold",
    expression: "a peaceful inward solitude, eyes calm and distant",
  },
  {
    slug: "the-poet", name: "The Poet", system: "cosmos", code: "FWLUB",
    subject: "young woman in her late 20s", seed: 100128,
    pose: "lost in expression, one hand trailing words of light into the air",
    wardrobe: "soft romantic layers in twilight purple",
    prop: "lines of glowing ink flowing from her fingertips into light",
    palette: "twilight purple and ink-blue",
    expression: "a tender absorbed feeling, gaze soft and unfocused",
  },
  {
    slug: "the-observer", name: "The Observer", system: "cosmos", code: "FWQPC",
    subject: "young man in his early 30s", seed: 100129,
    pose: "quietly focused, studying something small and precise",
    wardrobe: "a precise quiet grey-green jacket",
    prop: "a small glowing magnifier of light held to one eye",
    palette: "cool grey-green and pale silver",
  },
  {
    slug: "the-dreamer", name: "The Dreamer", system: "cosmos", code: "FWQPB",
    subject: "young woman in her mid-20s", seed: 100130,
    pose: "gazing upward, surrounded by drifting fragments of dream",
    wardrobe: "soft ethereal layers in lavender",
    prop: "floating fragments of dream-light and tiny stars drifting around her",
    palette: "lavender and starlight silver",
    expression: "a soft faraway wonder, eyes lifted and luminous",
  },
  {
    slug: "the-recluse", name: "The Recluse", system: "cosmos", code: "FWQUC",
    subject: "young woman in her early 30s", seed: 100131,
    pose: "in peaceful solitude, tending a small glowing plant alone",
    wardrobe: "quiet simple layers in muted sage",
    prop: "a small luminous potted plant cared for in the calm",
    palette: "muted sage and soft grey",
    expression: "a settled private peace, gaze calm and self-contained",
  },
  {
    slug: "the-mystic", name: "The Mystic", system: "cosmos", code: "FWQUB",
    subject: "man in his late 30s", seed: 100132,
    pose: "in serene transcendence, hands cradling a small living galaxy",
    wardrobe: "flowing mystic robes in deep cosmic violet",
    prop: "a small swirling galaxy of light held gently in cupped hands",
    palette: "deep cosmic violet and gold",
    expression: "a serene transcendent calm, eyes deep and knowing",
  },
];

// ---------------------------------------------------------------------------
// 10 Day-master archetypes (heavenly stems)
// ---------------------------------------------------------------------------

const DAYMASTER: Archetype[] = [
  {
    slug: "the-oak", name: "The Oak", system: "daymaster", code: "甲",
    subject: "man in his late 30s", seed: 200101,
    pose: "standing tall and straight-backed, principled and rooted",
    wardrobe: "earthy structured layers in bark-brown and forest green",
    prop: "luminous roots of light spreading from where he stands",
    palette: "forest green and bark brown",
  },
  {
    slug: "the-vine", name: "The Vine", system: "daymaster", code: "乙",
    subject: "young woman in her late 20s", seed: 200102,
    pose: "graceful and adaptive, body curving with easy persistence",
    wardrobe: "soft flowing layers in jade and pale green",
    prop: "delicate glowing vines winding gently around her arm",
    palette: "soft green and jade",
  },
  {
    slug: "the-sun", name: "The Sun", system: "daymaster", code: "丙",
    subject: "young woman in her mid-20s", seed: 200103,
    pose: "radiant and open, warmth projecting outward from the whole figure",
    wardrobe: "warm bright layers in gold and amber",
    prop: "a radiant halo of warm sunlight glowing around her",
    palette: "gold and warm orange",
    expression: "an open radiant warmth, a bright generous smile",
  },
  {
    slug: "the-lantern", name: "The Lantern", system: "daymaster", code: "丁",
    subject: "young man in his late 20s", seed: 200104,
    pose: "calm and guiding, holding a light up against the dark",
    wardrobe: "quiet warm layers in deep blue",
    prop: "a small steady lantern held high, casting precise warm light",
    palette: "warm amber against deep blue",
  },
  {
    slug: "the-mountain", name: "The Mountain", system: "daymaster", code: "戊",
    subject: "man in his early 50s", seed: 200105,
    pose: "immovable and dependable, planted with the weight of a mountain",
    wardrobe: "heavy grounded layers in stone grey and earth",
    prop: "a faint mountain silhouette of light rising behind him",
    palette: "stone grey and earth brown",
    expression: "an unshakeable steady calm, eyes settled like bedrock",
  },
  {
    slug: "the-garden", name: "The Garden", system: "daymaster", code: "己",
    subject: "young woman in her early 30s", seed: 200106,
    pose: "kneeling-to-standing, tending small growing things with care",
    wardrobe: "soft practical layers in warm soil-brown and green",
    prop: "small glowing seedlings sprouting in the cradle of her hands",
    palette: "warm soil brown and soft green",
    expression: "a patient nurturing warmth, gaze gentle and attentive",
  },
  {
    slug: "the-blade", name: "The Blade", system: "daymaster", code: "庚",
    subject: "young man in his late 20s", seed: 200107,
    pose: "poised and decisive, clean lines, no hesitation in the stance",
    wardrobe: "sharp tailored layers in steel grey",
    prop: "a gleaming blade of cool light held with calm precision",
    palette: "steel silver and cool blue",
    expression: "a sharp decisive focus, eyes clear and unwavering",
  },
  {
    slug: "the-gem", name: "The Gem", system: "daymaster", code: "辛",
    subject: "young woman in her mid-20s", seed: 200108,
    pose: "precise and self-possessed, refined stillness with quiet brilliance",
    wardrobe: "elegant fine layers in jewel tones",
    prop: "a glowing faceted gem turning slowly above her palm",
    palette: "amethyst and sapphire jewel tones",
  },
  {
    slug: "the-ocean", name: "The Ocean", system: "daymaster", code: "壬",
    subject: "man in his late 30s", seed: 200109,
    pose: "deep and patient, calm currents of movement around the figure",
    wardrobe: "flowing deep layers in ocean blue and teal",
    prop: "patient currents of luminous water circling slowly around him",
    palette: "deep ocean blue and teal",
    expression: "a deep patient calm, eyes vast and unhurried",
  },
  {
    slug: "the-stream", name: "The Stream", system: "daymaster", code: "癸",
    subject: "young woman in her late 20s", seed: 200110,
    pose: "light and flowing, finding the path of least resistance with ease",
    wardrobe: "light flowing layers in clear aqua and soft grey",
    prop: "a clear ribbon of flowing water-light winding around her",
    palette: "clear aqua and soft grey",
  },
];

export const ARCHETYPES: Archetype[] = [...COSMOS, ...DAYMASTER];
