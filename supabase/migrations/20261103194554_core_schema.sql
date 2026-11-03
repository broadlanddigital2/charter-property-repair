-- Charter Property Repair: core schema
-- Rebuilt from the legacy Laravel/MySQL app (insurance-api.broadlanddigital.co.uk).
-- Conventions:
--   * Primary keys are uuid `id`. For migrated rows this equals the legacy `guid`,
--     so existing links/IDs (and ServiceM8 references) stay stable.
--   * `legacy_id` keeps the old MySQL auto-increment id for the data migration.

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;
