-- ─── Supabase Storage bucket for generated images ──────────────────────────
-- Most asset URLs the platform serves today are either base64 data URLs
-- (Easy Diffusion) or public Replicate URLs that disappear after 24h. Both
-- break links the moment a model_files row is referenced from production:
-- data URLs balloon DB row sizes; Replicate URLs 404 the next day.
--
-- This migration provisions a public bucket so the API can copy each result
-- in once and store the durable URL. The bucket is public-read (showcase
-- needs to render images without authentication); writes are limited to the
-- service role via the application layer (we don't open writes via RLS).
--
-- Self-hosted Supabase keeps buckets in `storage.buckets`. The insert is
-- idempotent so applying this migration twice is safe.

insert into storage.buckets (id, name, public)
values ('generated-images', 'generated-images', true)
on conflict (id) do nothing;

-- Public-read policy. Writes happen via service-role (no RLS evaluation), so
-- we deliberately do NOT add an insert/update policy — that would expand the
-- attack surface without a use case.
drop policy if exists "public_read_generated_images" on storage.objects;
create policy "public_read_generated_images" on storage.objects
  for select using (bucket_id = 'generated-images');
