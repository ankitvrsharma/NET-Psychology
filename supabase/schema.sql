-- NET Psychology Supabase foundation: content + accounts + learner state
-- Run this whole file in Supabase SQL Editor.

create table if not exists public.content_items (
  id text not null, content_type text not null, title text, unit_id integer, topic_id integer, micro_id integer,
  item_type text, session text, question_number integer, source_tags jsonb not null default '[]'::jsonb,
  content jsonb not null, published boolean not null default true, updated_at timestamptz not null default now(),
  primary key (content_type,id)
);
create index if not exists content_items_lookup_idx on public.content_items (content_type,unit_id,topic_id,micro_id);
create index if not exists content_items_micro_idx on public.content_items (content_type,micro_id);
create index if not exists content_items_published_idx on public.content_items (content_type,published);

create table if not exists public.visual_assets (
  id text primary key, content_type text not null, content_id text not null, asset_type text not null, url text not null,
  alt_text text, width integer, height integer, bytes integer, published boolean not null default true, updated_at timestamptz not null default now(),
  unique (content_type,content_id,url)
);
create index if not exists visual_assets_content_idx on public.visual_assets (content_type,content_id,published);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, display_name text,
  role text not null default 'learner' check (role in ('learner','admin')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.learning_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,display_name)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name',''))
  on conflict(id) do update set email=excluded.email;
  insert into public.learning_state(user_id,state) values(new.id,'{}'::jsonb) on conflict(user_id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.content_items enable row level security;
alter table public.visual_assets enable row level security;
alter table public.profiles enable row level security;
alter table public.learning_state enable row level security;
revoke all on table public.content_items,public.visual_assets,public.profiles,public.learning_state from anon,authenticated;
grant select on public.content_items,public.visual_assets to anon,authenticated;
grant select on public.profiles to authenticated;
grant select,insert,update on public.learning_state to authenticated;

drop policy if exists "Public published content is readable" on public.content_items;
create policy "Public published content is readable" on public.content_items for select to anon,authenticated using(published=true);
drop policy if exists "Public published visuals are readable" on public.visual_assets;
create policy "Public published visuals are readable" on public.visual_assets for select to anon,authenticated using(published=true);
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated using(auth.uid()=id);
drop policy if exists "Users can read own learning state" on public.learning_state;
create policy "Users can read own learning state" on public.learning_state for select to authenticated using(auth.uid()=user_id);
drop policy if exists "Users can insert own learning state" on public.learning_state;
create policy "Users can insert own learning state" on public.learning_state for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Users can update own learning state" on public.learning_state;
create policy "Users can update own learning state" on public.learning_state for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

-- After creating your owner account, promote it once from the SQL editor:
-- update public.profiles set role='admin' where email='YOUR-ADMIN-EMAIL';
-- Never expose a service-role/secret key in the browser.
