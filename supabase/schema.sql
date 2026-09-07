-- ============================================================
-- Administratum — Supabase schema (PostgreSQL)
-- Run this in the Supabase SQL editor (or via the CLI) once.
-- Every table is scoped per-user via Row Level Security.
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Helper: updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  cover_image text,
  icon text,
  sort_order integer not null default 0,
  is_custom boolean not null default true,
  start_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.armies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  name text not null,
  description text not null default '',
  cover_image text,
  color_primary text,
  color_secondary text,
  sort_order integer not null default 0,
  start_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.miniatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  army_id uuid not null references public.armies (id) on delete cascade,
  name text not null,
  category text not null default 'infantry',
  quantity integer not null default 1,
  painted_count integer not null default 0,
  notes text not null default '',
  is_favorite boolean not null default false,
  sort_order integer not null default 0,
  purchased_at text,
  purchase_price numeric,
  store text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.miniature_statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  miniature_id uuid not null references public.miniatures (id) on delete cascade,
  status_type text not null,
  unique (miniature_id, status_type)
);

create table if not exists public.painting_processes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  miniature_id uuid not null references public.miniatures (id) on delete cascade,
  step_order integer not null default 0,
  title text not null,
  description text not null default '',
  colors_used text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.painting_process_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  process_id uuid not null references public.painting_processes (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size integer not null default 0,
  media_type text not null default 'image',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.miniature_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  miniature_id uuid not null references public.miniatures (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size integer not null default 0,
  width integer not null default 0,
  height integer not null default 0,
  thumbnail_path text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#6b7280',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.miniature_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  miniature_id uuid not null references public.miniatures (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  unique (miniature_id, tag_id)
);

create table if not exists public.army_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  game_id uuid references public.games (id) on delete set null,
  army_id uuid references public.armies (id) on delete set null,
  points integer not null default 0,
  game_date text,
  notes text not null default '',
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.army_list_miniatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list_id uuid not null references public.army_lists (id) on delete cascade,
  miniature_id uuid not null references public.miniatures (id) on delete cascade,
  quantity integer not null default 1,
  sort_order integer not null default 0
);

create table if not exists public.army_list_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list_id uuid not null references public.army_lists (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

-- Paint catalog is client-side static data; we only store the user's collection.
create table if not exists public.user_paints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  paint_id text not null,
  in_wishlist boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, paint_id, in_wishlist)
);

create table if not exists public.app_settings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value text not null,
  primary key (user_id, key)
);

-- ---------- Indexes ----------
create index if not exists idx_games_user on public.games (user_id);
create index if not exists idx_armies_game on public.armies (game_id);
create index if not exists idx_armies_user on public.armies (user_id);
create index if not exists idx_miniatures_army on public.miniatures (army_id);
create index if not exists idx_miniatures_user on public.miniatures (user_id);
create index if not exists idx_ms_miniature on public.miniature_statuses (miniature_id);
create index if not exists idx_pp_miniature on public.painting_processes (miniature_id);
create index if not exists idx_ppm_process on public.painting_process_media (process_id);
create index if not exists idx_mi_miniature on public.miniature_images (miniature_id);
create index if not exists idx_mt_miniature on public.miniature_tags (miniature_id);
create index if not exists idx_alm_list on public.army_list_miniatures (list_id);
create index if not exists idx_ali_list on public.army_list_images (list_id);
create index if not exists idx_up_user on public.user_paints (user_id);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array[
    'games','armies','miniatures','painting_processes',
    'painting_process_media','miniature_images','tags','army_lists'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- ============================================================
-- Row Level Security
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'games','armies','miniatures','miniature_statuses','painting_processes',
    'painting_process_media','miniature_images','tags','miniature_tags',
    'army_lists','army_list_miniatures','army_list_images','user_paints','app_settings'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "own_rows_select" on public.%I;', t);
    execute format('drop policy if exists "own_rows_insert" on public.%I;', t);
    execute format('drop policy if exists "own_rows_update" on public.%I;', t);
    execute format('drop policy if exists "own_rows_delete" on public.%I;', t);
    execute format(
      'create policy "own_rows_select" on public.%I for select using (user_id = auth.uid());', t);
    execute format(
      'create policy "own_rows_insert" on public.%I for insert with check (user_id = auth.uid());', t);
    execute format(
      'create policy "own_rows_update" on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
    execute format(
      'create policy "own_rows_delete" on public.%I for delete using (user_id = auth.uid());', t);
  end loop;
end$$;

-- ============================================================
-- Storage bucket for user media
-- ============================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Files are stored under `${auth.uid()}/...`; users can only touch their folder.
drop policy if exists "media_read" on storage.objects;
drop policy if exists "media_insert" on storage.objects;
drop policy if exists "media_update" on storage.objects;
drop policy if exists "media_delete" on storage.objects;

create policy "media_read" on storage.objects
  for select using (bucket_id = 'media');

create policy "media_insert" on storage.objects
  for insert with check (
    bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media_update" on storage.objects
  for update using (
    bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media_delete" on storage.objects
  for delete using (
    bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Account deletion (self-service)
-- ============================================================
-- Lets an authenticated user delete their own auth account.
-- All application rows are removed automatically via ON DELETE CASCADE.
-- Runs as SECURITY DEFINER so it can delete from auth.users.
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;

-- ============================================================
-- Global app configuration (admin-managed)
-- ============================================================
-- A single global row that only the site owner (admin) can modify,
-- but every authenticated user can read (e.g. to show an announcement).
--
-- IMPORTANT: replace 'TU-EMAIL@ejemplo.com' below with the email of the
-- account that should have admin rights, then run this block. It must match
-- the VITE_ADMIN_EMAIL value used by the frontend.
create table if not exists public.app_config (
  id text primary key default 'global',
  announcement text not null default '',
  announcement_enabled boolean not null default false,
  signups_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.app_config (id) values ('global') on conflict (id) do nothing;

alter table public.app_config enable row level security;

drop policy if exists "app_config_read" on public.app_config;
drop policy if exists "app_config_admin_write" on public.app_config;

-- Anyone (including logged-out visitors) can read the config.
create policy "app_config_read" on public.app_config
  for select to anon, authenticated using (true);

-- Only the admin email can modify it.
create policy "app_config_admin_write" on public.app_config
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'jlcaclosada@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jlcaclosada@gmail.com');

-- ============================================================
-- Army presets / factions (admin-managed catalog)
-- ============================================================
-- Global catalog of selectable factions per game, each with its own image.
-- Managed only by the admin, readable by every authenticated user so they can
-- pick a faction when creating an army.
--
-- IMPORTANT: replace 'TU-EMAIL@ejemplo.com' below with the same admin email.
create table if not exists public.army_presets (
  id uuid primary key default gen_random_uuid(),
  game_name text not null,
  name text not null,
  description text not null default '',
  color text not null default '#8b5cf6',
  image text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_army_presets_game
  on public.army_presets (game_name);

drop trigger if exists set_updated_at on public.army_presets;
create trigger set_updated_at before update on public.army_presets
  for each row execute function public.set_updated_at();

alter table public.army_presets enable row level security;

drop policy if exists "army_presets_read" on public.army_presets;
drop policy if exists "army_presets_admin_write" on public.army_presets;

-- Everyone logged in can read the faction catalog.
create policy "army_presets_read" on public.army_presets
  for select to authenticated using (true);

-- Only the admin can create / edit / delete factions.
create policy "army_presets_admin_write" on public.army_presets
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'jlcaclosada@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jlcaclosada@gmail.com');

-- ============================================================
-- Community: Articles (admin-authored news)
-- ============================================================
-- News/articles written by the admin. Readable by everyone (even logged-out),
-- but only the admin can create/edit/delete. Content is stored as TipTap JSON.
--
-- IMPORTANT: replace 'jlcaclosada@gmail.com' with the admin email if needed.
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users (id) on delete set null,
  title text not null,
  excerpt text not null default '',
  content jsonb,
  cover_image text,
  tags text[] not null default '{}',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_articles_created
  on public.articles (created_at desc);

drop trigger if exists set_updated_at on public.articles;
create trigger set_updated_at before update on public.articles
  for each row execute function public.set_updated_at();

alter table public.articles enable row level security;

drop policy if exists "articles_read" on public.articles;
drop policy if exists "articles_admin_write" on public.articles;

-- Everyone can read published articles; the admin can also read drafts.
create policy "articles_read" on public.articles
  for select to anon, authenticated
  using (published or (auth.jwt() ->> 'email') = 'jlcaclosada@gmail.com');

-- Only the admin can create / edit / delete articles.
create policy "articles_admin_write" on public.articles
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'jlcaclosada@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jlcaclosada@gmail.com');

-- ============================================================
-- Community: Painting guides (user-authored)
-- ============================================================
-- Tutorials/guides published by any user. Readable by everyone when published;
-- authors manage their own. Community rates them 1..5 (see guide_ratings).
create table if not exists public.painting_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '',
  title text not null,
  summary text not null default '',
  content jsonb,
  cover_image text,
  images text[] not null default '{}',
  tags text[] not null default '{}',
  game_name text,
  army_name text,
  paints jsonb not null default '[]',
  rating_sum integer not null default 0,
  rating_count integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_guides_created
  on public.painting_guides (created_at desc);
create index if not exists idx_guides_user
  on public.painting_guides (user_id);

drop trigger if exists set_updated_at on public.painting_guides;
create trigger set_updated_at before update on public.painting_guides
  for each row execute function public.set_updated_at();

alter table public.painting_guides enable row level security;

drop policy if exists "guides_read" on public.painting_guides;
drop policy if exists "guides_insert" on public.painting_guides;
drop policy if exists "guides_update" on public.painting_guides;
drop policy if exists "guides_delete" on public.painting_guides;

create policy "guides_read" on public.painting_guides
  for select to anon, authenticated
  using (published or user_id = auth.uid());

create policy "guides_insert" on public.painting_guides
  for insert to authenticated with check (user_id = auth.uid());

create policy "guides_update" on public.painting_guides
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "guides_delete" on public.painting_guides
  for delete to authenticated using (user_id = auth.uid());

-- ---------- Community ratings ----------
create table if not exists public.guide_ratings (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.painting_guides (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guide_id, user_id)
);

create index if not exists idx_guide_ratings_guide
  on public.guide_ratings (guide_id);

alter table public.guide_ratings enable row level security;

drop policy if exists "guide_ratings_read" on public.guide_ratings;
drop policy if exists "guide_ratings_insert" on public.guide_ratings;
drop policy if exists "guide_ratings_update" on public.guide_ratings;
drop policy if exists "guide_ratings_delete" on public.guide_ratings;

create policy "guide_ratings_read" on public.guide_ratings
  for select to authenticated using (true);
create policy "guide_ratings_insert" on public.guide_ratings
  for insert to authenticated with check (user_id = auth.uid());
create policy "guide_ratings_update" on public.guide_ratings
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "guide_ratings_delete" on public.guide_ratings
  for delete to authenticated using (user_id = auth.uid());

-- Keep rating_sum / rating_count on painting_guides in sync.
-- SECURITY DEFINER so a rater (not the guide owner) can update the aggregate.
create or replace function public.recalc_guide_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare gid uuid;
begin
  gid := coalesce(new.guide_id, old.guide_id);
  update public.painting_guides g set
    rating_sum = coalesce(
      (select sum(rating) from public.guide_ratings where guide_id = gid), 0),
    rating_count = coalesce(
      (select count(*) from public.guide_ratings where guide_id = gid), 0)
  where g.id = gid;
  return null;
end;
$$;

drop trigger if exists guide_rating_change on public.guide_ratings;
create trigger guide_rating_change
  after insert or update or delete on public.guide_ratings
  for each row execute function public.recalc_guide_rating();


