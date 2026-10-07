# Supabase content delivery

This folder adds a database-backed delivery layer without replacing GitHub as the source of truth.

GitHub JSON → import script → Supabase PostgreSQL → read-only Data API → learner.

Run `supabase/schema.sql` in the Supabase SQL Editor first. Then use `scripts/supabase_import.py` with `SUPABASE_URL` and `SUPABASE_SECRET_KEY` set in your local environment. The secret key is for import only and must never be placed in the website.

The browser will use the project's publishable key with Row Level Security enabled. The first rollout keeps the existing JSON pools as a fallback; no content shards are introduced.

Visuals are represented by rows in `visual_assets`; the actual image/diagram files should live in object/CDN storage rather than PostgreSQL. This allows visual flashcards and diagrams to grow without bloating the learning database.

Supabase setup reference: https://supabase.com/docs/guides/api and https://supabase.com/docs/guides/database/postgres/row-level-security


## Secure admin GitHub bridge

The Content Audit Workbench no longer asks the administrator to paste a GitHub token into the browser.

Repository writes are performed by the Supabase Edge Function:

`supabase/functions/admin-github-write/index.ts`

The function accepts only authenticated Supabase users whose `profiles.role` is `admin`, and it keeps the GitHub credential server-side. Supabase Edge Functions support production secrets that are not exposed to browser code. 

### One-time setup

1. Deploy the `admin-github-write` Edge Function to the Supabase project.
2. In Supabase Edge Function Secrets, create:
   `GITHUB_ADMIN_TOKEN`
3. Use a GitHub credential for `ankitvrsharma` with the repository permissions required by the workbench:
   - Contents: Read and write
   - Actions: Read and write
4. Never put the credential in `supabase-config.js`, GitHub Pages JavaScript, or chat.

The browser sends the signed-in Supabase session to the function; the function checks the caller's admin role before using the server-side GitHub credential.

### AI audit lineup

The Content Audit Workbench now has an **AI AUDIT · PASSED** section and filter. It reads `data/verification-state.json` entries marked `VERIFIED`, which are written by the source-to-content AI audit only for components that pass the independent component gate. These are deliberately kept separate from the administrator's **EXPERT VERIFIED** judgement.

