/**
 * English-language anchor case studies for the global rollout.
 *
 * Each entry is a fully-written case the team has shipped with a real
 * client (anonymized via `companyMask`). Entries here drive the /en/cases
 * page and feed JSON-LD for SEO. Start empty — the first three slots will
 * fill as we close anchor accounts in K-beauty / K-pop merch / EU
 * K-aesthetic categories.
 *
 * Adding a case: append a new entry below. The /en/cases page and sitemap
 * pick up new slugs on the next deployment.
 */

export type AnchorMarket =
  | "global"
  | "us"
  | "eu"
  | "uk"
  | "sea"
  | "kr-export";

export type AnchorVertical =
  | "k-beauty"
  | "k-fashion"
  | "k-pop-merch"
  | "k-drama-inspired"
  | "k-food"
  | "lifestyle";

export interface AnchorCase {
  slug: string;
  /** Headline shown on the case index card. */
  title: string;
  /** Sub-line. Concrete, scoped, evaluable. */
  pitch: string;
  /** Anonymized company name (e.g. "K-beauty SMB"). */
  companyMask: string;
  vertical: AnchorVertical;
  market: AnchorMarket;
  /** ISO date the case was made public. */
  publishedAt: string;
  /** How long the engagement ran. */
  durationLabel: string;
  /** Short, scannable highlight metrics. Keep at most 4. */
  metrics: { label: string; value: string }[];
  sections: { heading: string; body: string }[];
}

/** Empty until the first anchor case is signed off. Wave 84 ships the
 *  scaffolding so the slot exists; the /en/cases page degrades cleanly
 *  with a "first cases publishing soon" state.
 */
export const ANCHOR_CASES: AnchorCase[] = [];

export function listAnchorCases(): AnchorCase[] {
  return [...ANCHOR_CASES].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt)
  );
}

export function getAnchorCaseBySlug(slug: string): AnchorCase | undefined {
  return ANCHOR_CASES.find((c) => c.slug === slug);
}

/**
 * Generic methodology blocks used on the index page when zero anchor cases
 * are published yet. Concrete enough to be useful to a prospective brand
 * skimming the page, abstract enough to not claim outcomes we haven't
 * delivered.
 */
export const METHODOLOGY: { heading: string; body: string }[] = [
  {
    heading: "How we scope an engagement",
    body: "A 30-minute brief call, a written brief back from us (locking tone, market, deliverable list, and license window), and a quote PDF within 24 hours. Brands typically sign within a week and we are in production within two.",
  },
  {
    heading: "What we measure",
    body: "Lead time per stage (inquiry → brief → in_progress → review → delivered), p90 turnaround for revisions, and license-fit telemetry once the brand is live. The same dashboards our team uses to run the studio are what we report to the brand.",
  },
  {
    heading: "How we anonymize",
    body: "Once a case is public we mask the brand name unless they explicitly authorize an attribution. Numbers we publish are either ratios (e.g. cost ratio vs traditional shoot) or the brand's own metrics they let us cite. We never invent numbers.",
  },
  {
    heading: "What you can ask for",
    body: "References (we can introduce you to a current client after signing an NDA), a sample deliverable kit from a previous engagement, and a live walkthrough of our production dashboard so you can see what visibility you get during the engagement.",
  },
];

/**
 * The three categories we are actively recruiting anchor brands in.
 * Surfaced on the empty-state /en/cases so prospective fits can see the
 * shape of what we are building and reach out early.
 */
export const ANCHOR_CATEGORIES: {
  vertical: AnchorVertical;
  market: AnchorMarket;
  title: string;
  description: string;
}[] = [
  {
    vertical: "k-beauty",
    market: "us",
    title: "Korean K-beauty brand launching in the US",
    description:
      "Synthetic K-aesthetic talent for PDP hero, social, and the first three months of paid acquisition. We are looking for a brand that wants one face across all touchpoints from launch onwards.",
  },
  {
    vertical: "k-pop-merch",
    market: "us",
    title: "US K-pop fandom merchandise brand",
    description:
      "Catalog imagery + monthly lookbook drops for a US-based merch operator. A good fit if you ship multiple SKUs per quarter and want consistent visual language across them.",
  },
  {
    vertical: "k-drama-inspired",
    market: "eu",
    title: "European K-drama / K-aesthetic accessories",
    description:
      "Quarterly lookbook campaigns for an EU brand riffing on K-drama visual cues. EU AI Act disclosure is built in. We are looking for a brand that values aesthetic precision and can move quickly on a 6-week first delivery.",
  },
];
