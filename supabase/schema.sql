-- NET Psychology selective content delivery
-- Run this in Supabase SQL Editor before importing content.
-- Runtime clients are read-only; imports must use a server-side secret key.

create table if not exists public.content_items (
  id text not null,
  content_type text not null,
  title text,
  unit_id integer,
  topic_id integer,
  micro_id integer,
  item_type text,
  session text,
  question_number integer,
  source_tags jsonb not null default '[]'::jsonb,
  content jsonb not null,
  published boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (content_type, id)
);

create index if not exists content_items_lookup_idx
  on public.content_items (content_type, unit_id, topic_id, micro_id);

create index if not exists content_items_micro_idx
  on public.content_items (content_type, micro_id);

create index if not exists content_items_published_idx
  on public.content_items (content_type, published);

create table if not exists public.visual_assets (
  id text primary key,
  content_type text not null,
  content_id text not null,
  asset_type text not null,
  url text not null,
  alt_text text,
  width integer,
  height integer,
  bytes integer,
  published boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (content_type, content_id, url)
);

create index if not exists visual_assets_content_idx
  on public.visual_assets (content_type, content_id, published);

alter table public.content_items enable row level security;
alter table public.visual_assets enable row level security;

revoke all on table public.content_items from anon, authenticated;
revoke all on table public.visual_assets from anon, authenticated;

grant select on table public.content_items to anon, authenticated;
grant select on table public.visual_assets to anon, authenticated;

drop policy if exists "Public published content is readable" on public.content_items;
create policy "Public published content is readable"
  on public.content_items
  for select
  to anon, authenticated
  using (published = true);

drop policy if exists "Public published visuals are readable" on public.visual_assets;
create policy "Public published visuals are readable"
  on public.visual_assets
  for select
  to anon, authenticated
  using (published = true);

-- The browser must NEVER receive a secret/service key.
-- The publishable key is appropriate for the public client only when RLS is enabled.
