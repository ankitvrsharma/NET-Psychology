# Supabase content delivery

This folder adds a database-backed delivery layer without replacing GitHub as the source of truth.

GitHub static JSON → validation → Supabase synchronization → read-only Data API → learner.

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



## Content rewrite → audit → publish → sync

The Admin Content Enrichment panel is the authoring control for improving existing source-backed content.

1. Enter a rewrite/improvement instruction and optional canonical micro-topic IDs.
2. Saving the instruction updates `data/content-enrichment-instructions.json`, which triggers the source-to-content workflow.
3. Gemini rewrites the existing connected five-component package from approved source evidence.
4. The independent AI audit checks Micro-topic, Deep Dive, Active Recall, Revision and Practice separately.
5. Components that pass are published to the canonical static pools and marked `AI REVIEWED`.
6. Components that fail after the rewrite attempts remain withheld in the owner approval queue.
7. Owner-approved queue items are published and marked `EXPERT VERIFIED`.
8. Every successful static-content publication runs the Supabase synchronization job.

AI review and expert verification are intentionally different states: `AI REVIEWED` means the source-grounded AI gate passed; `EXPERT VERIFIED` means the owner explicitly approved the component.

### GitHub Actions secrets for Supabase synchronization

The publish workflow needs these GitHub repository secrets:

- `SUPABASE_SERVICE_ROLE_KEY` — the Supabase service-role key. This is server-side only and must never be exposed to the browser. The workflow already contains the non-secret project URL.

The synchronization script writes the canonical static pools to `public.content_items` with upsert semantics. The static GitHub pools remain the canonical source of truth; Supabase is the delivery copy.
