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
  -- The superadmin account can never be deleted, not even by itself.
  if public.is_superadmin() then
    raise exception 'La cuenta del superadministrador no se puede eliminar';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;

-- ============================================================
-- User profiles (avatar, bio, and other personalization)
-- ============================================================
-- A separate public table rather than more auth.users metadata: metadata
-- isn't queryable/joinable from the client, and this is the Supabase-
-- idiomatic place for profile data other users may eventually need to see.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  bio text not null default '',
  location text not null default '',
  favorite_faction text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;

create policy "profiles_read" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Auto-create a blank profile row for every new signup, so a profile
-- always exists without the client needing to remember to create one.
-- Existing users (signed up before this table existed) get theirs
-- lazily via upsert the first time they save from Settings.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: accounts created before the trigger existed get a profile row
-- now, so every user has a public profile page and appears in admin.
insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'display_name', '')
from auth.users u
on conflict (id) do nothing;

-- Instagram-style extra links: [{ "label": "...", "url": "https://..." }].
alter table public.profiles add column if not exists links jsonb not null default '[]'::jsonb;

-- ============================================================
-- Roles: superadmin (fixed by email, untouchable) + promotable admins
-- ============================================================
-- The superadmin is the site owner, identified by email so the account can
-- never lose its powers through a data change. Everyone else is 'user' or
-- 'admin' via profiles.role, which only admins can change (see trigger).
-- IMPORTANT: keep this email in sync with VITE_ADMIN_EMAIL in the frontend.
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));

create or replace function public.superadmin_email()
returns text language sql immutable as $$ select 'jlcaclosada@gmail.com'::text $$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
as $$ select coalesce(lower(auth.jwt() ->> 'email') = public.superadmin_email(), false) $$;

create or replace function public.is_superadmin_user(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$ select exists (select 1 from auth.users where id = uid and lower(email) = public.superadmin_email()) $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Nobody can grant themselves a role; only admins change roles, and the
-- superadmin's row can never be altered this way.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role <> 'user' and not public.is_admin() then
      new.role := 'user';
    end if;
  elsif new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'No autorizado para cambiar roles';
    end if;
    if public.is_superadmin_user(new.id) then
      raise exception 'El superadministrador no se puede modificar';
    end if;
    -- Only the superadmin can demote another admin.
    if old.role = 'admin' and not public.is_superadmin() then
      raise exception 'Solo el superadministrador puede retirar permisos de administrador';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before insert or update on public.profiles
  for each row execute function public.protect_profile_role();

-- Admin user directory. Joins auth.users (email, last sign-in) which the
-- client can't read directly — hence SECURITY DEFINER + explicit admin check.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  avatar_url text,
  role text,
  is_superadmin boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  return query
    select u.id, u.email::text, coalesce(p.display_name, ''), p.avatar_url,
           coalesce(p.role, 'user'), lower(u.email) = public.superadmin_email(),
           u.created_at, u.last_sign_in_at
    from auth.users u
    left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end;
$$;

create or replace function public.admin_set_role(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if new_role not in ('user', 'admin') then
    raise exception 'Rol no válido';
  end if;
  insert into public.profiles (id, role) values (target, new_role)
  on conflict (id) do update set role = excluded.role;
end;
$$;

-- Regular admins may delete regular users; deleting an admin requires the
-- superadmin; nobody can delete the superadmin.
create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_role text;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if target = auth.uid() then
    raise exception 'Usa Ajustes para eliminar tu propia cuenta';
  end if;
  if public.is_superadmin_user(target) then
    raise exception 'El superadministrador no se puede eliminar';
  end if;
  select role into target_role from public.profiles where id = target;
  if target_role = 'admin' and not public.is_superadmin() then
    raise exception 'Solo el superadministrador puede eliminar a otro administrador';
  end if;
  delete from auth.users where id = target;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ============================================================
-- Global app configuration (admin-managed)
-- ============================================================
-- A single global row that only the site owner (admin) can modify,
-- but every authenticated user can read (e.g. to show an announcement).
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
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Army presets / factions (admin-managed catalog)
-- ============================================================
-- Global catalog of selectable factions per game, each with its own image.
-- Managed only by the admin, readable by every authenticated user so they can
-- pick a faction when creating an army.
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
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Community: Articles (admin-authored news)
-- ============================================================
-- News/articles written by the admin. Readable by everyone (even logged-out),
-- but only admins (see public.is_admin()) can create/edit/delete. Content is
-- stored as TipTap JSON.
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users (id) on delete set null,
  title text not null,
  excerpt text not null default '',
  content jsonb,
  cover_image text,
  tags text[] not null default '{}',
  published boolean not null default true,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Retrofit for installs where the table already existed before like_count.
alter table public.articles add column if not exists like_count integer not null default 0;

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
  using (published or public.is_admin());

-- Only the admin can create / edit / delete articles.
create policy "articles_admin_write" on public.articles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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
  like_count integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Retrofit for installs where the table already existed before like_count.
alter table public.painting_guides add column if not exists like_count integer not null default 0;

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

-- ============================================================
-- Unit catalog (Munitorum Field Manual)
-- ============================================================
create table if not exists public.unit_catalog (
  id uuid primary key default gen_random_uuid(),
  game_name text not null default 'Warhammer 40,000',
  faction_slug text not null,
  faction_name text not null,
  name text not null,
  category text not null default 'squad',
  group_title text,
  pricing jsonb not null default '[]',
  wargear jsonb not null default '[]',
  leader_to text[] not null default '{}',
  support_to text[] not null default '{}',
  legends boolean not null default false,
  default_quantity integer not null default 1,
  mfm_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_name, faction_slug, name)
);

create index if not exists idx_unit_catalog_faction
  on public.unit_catalog (game_name, faction_name);

create index if not exists idx_unit_catalog_name
  on public.unit_catalog (name);

drop trigger if exists set_updated_at on public.unit_catalog;
create trigger set_updated_at before update on public.unit_catalog
  for each row execute function public.set_updated_at();

alter table public.unit_catalog enable row level security;

drop policy if exists "unit_catalog_read" on public.unit_catalog;
drop policy if exists "unit_catalog_admin_write" on public.unit_catalog;

create policy "unit_catalog_read" on public.unit_catalog
  for select to authenticated using (true);

create policy "unit_catalog_admin_write" on public.unit_catalog
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.miniatures
  add column if not exists catalog_unit_id uuid references public.unit_catalog (id) on delete set null;

alter table public.miniatures
  add column if not exists points_snapshot jsonb;

-- ============================================================
-- Faction catalog (Munitorum Field Manual) — detachments + faction art
-- ============================================================
-- One row per faction/game. Detachments (with their enhancements) are
-- stored as jsonb since they're read-only reference data scraped from the
-- MFM, never queried by sub-field. `image` is a hotlinked URL to the MFM's
-- own faction artwork (mfm.warhammer-community.com), not re-hosted.
create table if not exists public.faction_catalog (
  id uuid primary key default gen_random_uuid(),
  game_name text not null default 'Warhammer 40,000',
  faction_slug text not null,
  faction_name text not null,
  image text,
  parent_faction text,
  detachments jsonb not null default '[]',
  mfm_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_name, faction_slug)
);

create index if not exists idx_faction_catalog_game
  on public.faction_catalog (game_name);

drop trigger if exists set_updated_at on public.faction_catalog;
create trigger set_updated_at before update on public.faction_catalog
  for each row execute function public.set_updated_at();

alter table public.faction_catalog enable row level security;

drop policy if exists "faction_catalog_read" on public.faction_catalog;
drop policy if exists "faction_catalog_admin_write" on public.faction_catalog;

create policy "faction_catalog_read" on public.faction_catalog
  for select to authenticated using (true);

create policy "faction_catalog_admin_write" on public.faction_catalog
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Downloads catalog (Warhammer Community — official PDFs)
-- ============================================================
-- Mirrors https://www.warhammer-community.com/en-gb/downloads/warhammer-40000/
-- (faction packs, core rules, FAQs/errata, event companions, etc.), kept in
-- sync by a daily cron (see scripts/downloads/). `source_updated_at` is
-- Games Workshop's own "Last Updated" date for the file — used to detect
-- when a PDF has been replaced, independent of when *we* last synced it.
create table if not exists public.downloads_catalog (
  id uuid primary key default gen_random_uuid(),
  game_name text not null default 'Warhammer 40,000',
  slug text not null,
  title text not null,
  category text not null,
  file_url text not null,
  file_size text,
  thumbnail text,
  topics text[] not null default '{}',
  source_updated_at date,
  is_new boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_name, slug)
);

create index if not exists idx_downloads_catalog_game
  on public.downloads_catalog (game_name, category);

drop trigger if exists set_updated_at on public.downloads_catalog;
create trigger set_updated_at before update on public.downloads_catalog
  for each row execute function public.set_updated_at();

alter table public.downloads_catalog enable row level security;

drop policy if exists "downloads_catalog_read" on public.downloads_catalog;
drop policy if exists "downloads_catalog_admin_write" on public.downloads_catalog;

create policy "downloads_catalog_read" on public.downloads_catalog
  for select to authenticated using (true);

create policy "downloads_catalog_admin_write" on public.downloads_catalog
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Catalog updates (activity feed for the two crons above)
-- ============================================================
-- One row per change the sync scripts actually detect: a unit's points
-- moved, or a new/updated document appeared in the downloads catalog.
-- Shown as "Últimos updates" on the home page.
create table if not exists public.catalog_updates (
  id uuid primary key default gen_random_uuid(),
  game_name text not null default 'Warhammer 40,000',
  type text not null check (type in ('points', 'download')),
  title text not null,
  description text not null default '',
  link text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_catalog_updates_game
  on public.catalog_updates (game_name, occurred_at desc);

-- Structured point change for 'points' updates, so the UI can show a
-- signed ±N pts badge instead of parsing it out of the description.
alter table public.catalog_updates add column if not exists points_before integer;
alter table public.catalog_updates add column if not exists points_after integer;
alter table public.catalog_updates add column if not exists points_delta integer;

alter table public.catalog_updates enable row level security;

drop policy if exists "catalog_updates_read" on public.catalog_updates;
drop policy if exists "catalog_updates_admin_write" on public.catalog_updates;

create policy "catalog_updates_read" on public.catalog_updates
  for select to authenticated using (true);

create policy "catalog_updates_admin_write" on public.catalog_updates
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Miniature spotlight ("Miniatura del mes")
-- ============================================================
-- One row per entry the admin publishes; the home page shows the most
-- recent one. Kept as a small history (not a singleton) so past spotlights
-- aren't lost when the admin sets a new one.
create table if not exists public.miniature_spotlight (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  game_name text,
  faction_name text,
  painter_name text,
  description text not null default '',
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_miniature_spotlight_created
  on public.miniature_spotlight (created_at desc);

drop trigger if exists set_updated_at on public.miniature_spotlight;
create trigger set_updated_at before update on public.miniature_spotlight
  for each row execute function public.set_updated_at();

alter table public.miniature_spotlight enable row level security;

drop policy if exists "miniature_spotlight_read" on public.miniature_spotlight;
drop policy if exists "miniature_spotlight_admin_write" on public.miniature_spotlight;

create policy "miniature_spotlight_read" on public.miniature_spotlight
  for select to anon, authenticated using (true);

create policy "miniature_spotlight_admin_write" on public.miniature_spotlight
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Competitive: tournaments (admin-curated)
-- ============================================================
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  game_name text,
  description text not null default '',
  cover_image text,
  location text,
  start_date date,
  end_date date,
  status text not null default 'upcoming' check (status in ('upcoming', 'ongoing', 'finished')),
  external_link text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tournaments_start_date
  on public.tournaments (start_date desc);

drop trigger if exists set_updated_at on public.tournaments;
create trigger set_updated_at before update on public.tournaments
  for each row execute function public.set_updated_at();

alter table public.tournaments enable row level security;

drop policy if exists "tournaments_read" on public.tournaments;
drop policy if exists "tournaments_admin_write" on public.tournaments;

create policy "tournaments_read" on public.tournaments
  for select to anon, authenticated
  using (published or public.is_admin());

create policy "tournaments_admin_write" on public.tournaments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Competitive: featured lists (admin-curated showcase army lists)
-- ============================================================
-- Not linked to a real user's private army list (those stay owner-only,
-- see armies/army_lists RLS) — these are separate, admin-authored public
-- showcase entries, same pattern as articles/guides.
create table if not exists public.featured_lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  game_name text,
  faction_name text,
  total_points integer,
  author_name text not null default '',
  description text not null default '',
  cover_image text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_featured_lists_created
  on public.featured_lists (created_at desc);

drop trigger if exists set_updated_at on public.featured_lists;
create trigger set_updated_at before update on public.featured_lists
  for each row execute function public.set_updated_at();

alter table public.featured_lists enable row level security;

drop policy if exists "featured_lists_read" on public.featured_lists;
drop policy if exists "featured_lists_admin_write" on public.featured_lists;

create policy "featured_lists_read" on public.featured_lists
  for select to anon, authenticated
  using (published or public.is_admin());

create policy "featured_lists_admin_write" on public.featured_lists
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The actual list: parsed army-list export (see src/lib/armyListParser.ts)
-- plus the optional tournament result in "V-D-E" form.
alter table public.featured_lists add column if not exists list_data jsonb;
alter table public.featured_lists add column if not exists result text;
alter table public.featured_lists add column if not exists tournament_name text;

-- ============================================================
-- Advertising (admin-managed, shown in the app's side margins)
-- ============================================================
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  image text not null,
  url text not null,
  position text not null default 'right' check (position in ('left', 'right')),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ads_position on public.ads (position, sort_order);

drop trigger if exists set_updated_at on public.ads;
create trigger set_updated_at before update on public.ads
  for each row execute function public.set_updated_at();

alter table public.ads enable row level security;

drop policy if exists "ads_read" on public.ads;
drop policy if exists "ads_admin_write" on public.ads;

create policy "ads_read" on public.ads
  for select to anon, authenticated
  using (active or public.is_admin());
create policy "ads_admin_write" on public.ads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================
-- Community: shared photos (users share pictures of their collection)
-- ============================================================
-- Freestanding, always-public posts — distinct from miniature_images /
-- army_list_images, which stay private per-owner. Shown on the home page
-- and in the community feed.
create table if not exists public.shared_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '',
  image text not null,
  caption text not null default '',
  game_name text,
  army_name text,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shared_photos_created
  on public.shared_photos (created_at desc);

drop trigger if exists set_updated_at on public.shared_photos;
create trigger set_updated_at before update on public.shared_photos
  for each row execute function public.set_updated_at();

alter table public.shared_photos enable row level security;

drop policy if exists "shared_photos_read" on public.shared_photos;
drop policy if exists "shared_photos_insert" on public.shared_photos;
drop policy if exists "shared_photos_update" on public.shared_photos;
drop policy if exists "shared_photos_delete" on public.shared_photos;

create policy "shared_photos_read" on public.shared_photos
  for select to anon, authenticated using (true);
create policy "shared_photos_insert" on public.shared_photos
  for insert to authenticated with check (user_id = auth.uid());
create policy "shared_photos_update" on public.shared_photos
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "shared_photos_delete" on public.shared_photos
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- Community: comments (on articles, guides, and shared photos)
-- ============================================================
-- One flat table for every commentable content type instead of a
-- comments-per-type table, since the shape (author, body, target) never
-- actually varies by target_type.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '',
  target_type text not null check (target_type in ('article', 'guide', 'photo')),
  target_id uuid not null,
  content text not null,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comments_target
  on public.comments (target_type, target_id, created_at);

drop trigger if exists set_updated_at on public.comments;
create trigger set_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

alter table public.comments enable row level security;

drop policy if exists "comments_read" on public.comments;
drop policy if exists "comments_insert" on public.comments;
drop policy if exists "comments_update" on public.comments;
drop policy if exists "comments_delete" on public.comments;

create policy "comments_read" on public.comments
  for select to anon, authenticated using (true);
create policy "comments_insert" on public.comments
  for insert to authenticated with check (user_id = auth.uid());
create policy "comments_update" on public.comments
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Authors delete their own comment; the admin can moderate any comment.
create policy "comments_delete" on public.comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- Community: likes (on articles, guides, comments, and shared photos)
-- ============================================================
-- One polymorphic table for every likeable content type, mirroring the
-- comments table above. A denormalized like_count on each parent table
-- is kept in sync by the trigger below, the same SECURITY DEFINER
-- pattern as recalc_guide_rating() — the liker is never the row owner,
-- so the trigger needs elevated rights to update someone else's row.
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('article', 'guide', 'comment', 'photo')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index if not exists idx_likes_target
  on public.likes (target_type, target_id);

alter table public.likes enable row level security;

drop policy if exists "likes_read" on public.likes;
drop policy if exists "likes_insert" on public.likes;
drop policy if exists "likes_delete" on public.likes;

create policy "likes_read" on public.likes
  for select to anon, authenticated using (true);
create policy "likes_insert" on public.likes
  for insert to authenticated with check (user_id = auth.uid());
create policy "likes_delete" on public.likes
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.recalc_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t_type text;
  t_id uuid;
  cnt integer;
begin
  t_type := coalesce(new.target_type, old.target_type);
  t_id := coalesce(new.target_id, old.target_id);
  select count(*) into cnt from public.likes
    where target_type = t_type and target_id = t_id;
  if t_type = 'article' then
    update public.articles set like_count = cnt where id = t_id;
  elsif t_type = 'guide' then
    update public.painting_guides set like_count = cnt where id = t_id;
  elsif t_type = 'comment' then
    update public.comments set like_count = cnt where id = t_id;
  elsif t_type = 'photo' then
    update public.shared_photos set like_count = cnt where id = t_id;
  end if;
  return null;
end;
$$;

drop trigger if exists likes_change on public.likes;
create trigger likes_change
  after insert or delete on public.likes
  for each row execute function public.recalc_like_count();

-- ============================================================
-- Social: friendships
-- ============================================================
-- One row per pair. A request is 'pending' until the addressee accepts it
-- through accept_friend_request() — there is deliberately no UPDATE policy,
-- so nobody can rewrite who a friendship is between.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists idx_friendships_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists idx_friendships_addressee on public.friendships (addressee_id, status);

drop trigger if exists set_updated_at on public.friendships;
create trigger set_updated_at before update on public.friendships
  for each row execute function public.set_updated_at();

alter table public.friendships enable row level security;

drop policy if exists "friendships_read" on public.friendships;
drop policy if exists "friendships_insert" on public.friendships;
drop policy if exists "friendships_delete" on public.friendships;

create policy "friendships_read" on public.friendships
  for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));
create policy "friendships_insert" on public.friendships
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');
create policy "friendships_delete" on public.friendships
  for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));

create or replace function public.accept_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.friendships set status = 'accepted'
  where id = request_id and addressee_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'Solicitud no encontrada';
  end if;
end;
$$;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(a, b)
      and greatest(requester_id, addressee_id) = greatest(a, b)
  )
$$;

-- Public counters for a profile page. Friendships themselves are private
-- to the two people involved, so the count is exposed through this RPC.
create or replace function public.profile_stats(uid uuid)
returns table (friends integer, photos integer, guides integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.friendships
       where status = 'accepted' and uid in (requester_id, addressee_id)),
    (select count(*)::int from public.shared_photos where user_id = uid),
    (select count(*)::int from public.painting_guides where user_id = uid and published)
$$;

revoke all on function public.accept_friend_request(uuid) from public, anon;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.profile_stats(uuid) to anon, authenticated;

-- ============================================================
-- Social: private chat between friends
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_pair
  on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);
create index if not exists idx_messages_unread
  on public.messages (recipient_id) where read_at is null;

alter table public.messages enable row level security;

drop policy if exists "messages_read" on public.messages;
drop policy if exists "messages_insert" on public.messages;

create policy "messages_read" on public.messages
  for select to authenticated
  using (auth.uid() in (sender_id, recipient_id));
-- Only friends can message each other.
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.are_friends(sender_id, recipient_id));

-- Marking as read goes through this RPC instead of an UPDATE policy, which
-- would otherwise also let the recipient rewrite message content.
create or replace function public.mark_conversation_read(other uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages set read_at = now()
  where recipient_id = auth.uid() and sender_id = other and read_at is null
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Live chat: stream new messages to both participants (RLS still applies).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end$$;
