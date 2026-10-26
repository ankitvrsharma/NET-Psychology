-- Database-backed Site Studio publishing. This stores public site documents only;
-- learner-specific progress remains in learning_state and is never exposed here.
create table if not exists public.site_documents (
  document_key text primary key,
  document jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  revision integer not null default 1,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.site_documents enable row level security;
revoke all on public.site_documents from anon, authenticated;
grant select on public.site_documents to anon, authenticated;

drop policy if exists "Public can read published site documents" on public.site_documents;
create policy "Public can read published site documents"
  on public.site_documents for select to anon, authenticated
  using (published = true);

-- Writes are intentionally performed only by the admin-verified Edge Function.
-- No client INSERT/UPDATE/DELETE policy is granted.
