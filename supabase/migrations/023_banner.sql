-- ─── 023_banner ──────────────────────────────────────────────────────────────
-- Site-wide announcement banner config. Stored as JSONB on the single-row
-- app_settings table so the admin UI can edit it without redeploying. Keep
-- the column nullable so a fresh install renders nothing rather than a
-- blank bar.
--
-- Shape:
--   {
--     "text":     "string — Korean copy",
--     "href":     "string — optional CTA link",
--     "tone":     "info" | "warn" | "promo",
--     "updated_at": ISO8601 string
--   }
--
-- Banner null/missing/empty text  → hidden client-side. We also bump an
-- updated_at field at write time so the dismissal cookie can invalidate
-- when content changes (visitors see fresh banners even after dismissing
-- the previous one).

alter table app_settings
  add column if not exists banner jsonb;

comment on column app_settings.banner is
  'Site-wide banner config. NULL = no banner. Schema: { text, href?, tone?, updated_at }';
