# Supabase content delivery

This folder adds a database-backed delivery layer without replacing GitHub as the source of truth.

GitHub JSON → import script → Supabase PostgreSQL → read-only Data API → learner.

Run `supabase/schema.sql` in the Supabase SQL Editor first. Then use `scripts/supabase_import.py` with `SUPABASE_URL` and `SUPABASE_SECRET_KEY` set in your local environment. The secret key is for import only and must never be placed in the website.

The browser will use the project's publishable key with Row Level Security enabled. The first rollout keeps the existing JSON pools as a fallback; no content shards are introduced.

Visuals are represented by rows in `visual_assets`; the actual image/diagram files should live in object/CDN storage rather than PostgreSQL. This allows visual flashcards and diagrams to grow without bloating the learning database.

Supabase setup reference: https://supabase.com/docs/guides/api and https://supabase.com/docs/guides/database/postgres/row-level-security
