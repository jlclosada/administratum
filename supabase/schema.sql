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
  -- Email signups send display_name; Google sends full_name/name and a
  -- profile picture (avatar_url/picture).
  insert into public.profiles (id, display_name, avatar_url, email_updates)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      ''
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    -- Sign-up form choice; Google sign-ups don't send it (they can opt out
    -- in Ajustes or from any email).
    coalesce((new.raw_user_meta_data ->> 'email_updates')::boolean, true)
  )
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

-- When the user finished (or skipped) the welcome wizard; null = show it on
-- their next visit. The first time this runs, everyone who already has an
-- account is marked as onboarded so only new sign-ups see the wizard.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'onboarded_at'
  ) then
    alter table public.profiles add column onboarded_at timestamptz;
    update public.profiles set onboarded_at = created_at;
  end if;
end;
$$;

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

-- Public reference data: readable without an account (public pages, SEO).
create policy "unit_catalog_read" on public.unit_catalog
  for select to anon, authenticated using (true);

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

-- Public reference data: readable without an account (public pages, SEO).
create policy "faction_catalog_read" on public.faction_catalog
  for select to anon, authenticated using (true);

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

-- Public reference data: readable without an account (public pages, SEO).
create policy "downloads_catalog_read" on public.downloads_catalog
  for select to anon, authenticated using (true);

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

-- One-off cleanup (safe to re-run): until 30 Sep 2026 the MFM sync compared
-- stored jsonb with freshly scraped JSON as text, so every run logged every
-- unit as "changed" without any points delta. None of those rows is real.
delete from public.catalog_updates
  where type = 'points'
    and points_delta is null
    and occurred_at < '2026-10-01';

alter table public.catalog_updates enable row level security;

drop policy if exists "catalog_updates_read" on public.catalog_updates;
drop policy if exists "catalog_updates_admin_write" on public.catalog_updates;

-- Public reference data: readable without an account (public pages, SEO).
create policy "catalog_updates_read" on public.catalog_updates
  for select to anon, authenticated using (true);

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

-- Tournament rules ("bases") as TipTap JSON, plus key facts for the
-- detail page.
alter table public.tournaments add column if not exists rules jsonb;
alter table public.tournaments add column if not exists points_limit integer;
alter table public.tournaments add column if not exists max_players integer;
alter table public.tournaments add column if not exists entry_fee text;

-- Who runs the tournament (club, shop, association) and whether sign-ups
-- are closed. Both feed the page and Google's Event data (organizer, offers).
alter table public.tournaments add column if not exists organizer text;
alter table public.tournaments add column if not exists registration_closed boolean not null default false;

-- external_link must be a URL. Notes typed there by hand ("Inscripción
-- cerrada") become the flag; bare domains get https://. Safe to re-run.
update public.tournaments
  set registration_closed = true, external_link = null
  where external_link is not null and external_link !~* '^https?://' and external_link ilike '%cerrad%';
update public.tournaments
  set external_link = 'https://' || external_link
  where external_link is not null and external_link !~* '^https?://' and external_link ~ '^[^\s/]+\.[a-z]{2,}(/\S*)?$';

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

-- Instagram-style posts: a short title shown under the image (caption is
-- the longer description) and a denormalized comment count for the feed.
alter table public.shared_photos add column if not exists title text not null default '';
alter table public.shared_photos add column if not exists comment_count integer not null default 0;

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
  elsif t_type = 'list' then
    update public.community_lists set like_count = cnt where id = t_id;
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

revoke all on function public.accept_friend_request(uuid) from public, anon;
grant execute on function public.accept_friend_request(uuid) to authenticated;

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

-- ============================================================
-- Community: comment counts on shared photos and community lists
-- ============================================================
-- Same SECURITY DEFINER pattern as recalc_like_count(): the commenter is
-- usually not the post's owner, so the trigger needs elevated rights.
create or replace function public.recalc_comment_count()
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
  if t_type not in ('photo', 'list') then
    return null;
  end if;
  t_id := coalesce(new.target_id, old.target_id);
  select count(*) into cnt from public.comments where target_type = t_type and target_id = t_id;
  if t_type = 'photo' then
    update public.shared_photos set comment_count = cnt where id = t_id;
  else
    update public.community_lists set comment_count = cnt where id = t_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_photo_count on public.comments;
drop function if exists public.recalc_photo_comment_count();
drop trigger if exists comments_count on public.comments;
create trigger comments_count
  after insert or delete on public.comments
  for each row execute function public.recalc_comment_count();

-- Backfill counts for photos commented before the trigger existed.
update public.shared_photos p
  set comment_count = c.n
  from (
    select target_id, count(*)::int as n from public.comments
    where target_type = 'photo' group by target_id
  ) c
  where c.target_id = p.id and p.comment_count <> c.n;

-- ============================================================
-- Community: saved posts (private bookmarks)
-- ============================================================
create table if not exists public.saved_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  photo_id uuid not null references public.shared_photos (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, photo_id)
);

create index if not exists idx_saved_photos_user on public.saved_photos (user_id, created_at desc);

alter table public.saved_photos enable row level security;

drop policy if exists "saved_photos_read" on public.saved_photos;
drop policy if exists "saved_photos_insert" on public.saved_photos;
drop policy if exists "saved_photos_delete" on public.saved_photos;

-- Only the owner ever sees their saved posts.
create policy "saved_photos_read" on public.saved_photos
  for select to authenticated using (user_id = auth.uid());
create policy "saved_photos_insert" on public.saved_photos
  for insert to authenticated with check (user_id = auth.uid());
create policy "saved_photos_delete" on public.saved_photos
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- Community: shared army lists
-- ============================================================
-- Lists users publish for the community (pasted export, parsed client-side
-- by src/lib/armyListParser.ts). Title, faction, points and a short
-- explanation are mandatory.
create table if not exists public.community_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '',
  title text not null check (char_length(btrim(title)) between 1 and 120),
  faction_name text not null check (char_length(btrim(faction_name)) > 0),
  total_points integer not null check (total_points > 0),
  description text not null check (char_length(btrim(description)) >= 20),
  detachment_name text,
  list_data jsonb not null,
  result text,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_lists_created on public.community_lists (created_at desc);
create index if not exists idx_community_lists_user on public.community_lists (user_id, created_at desc);

drop trigger if exists set_updated_at on public.community_lists;
create trigger set_updated_at before update on public.community_lists
  for each row execute function public.set_updated_at();

alter table public.community_lists enable row level security;

drop policy if exists "community_lists_read" on public.community_lists;
drop policy if exists "community_lists_insert" on public.community_lists;
drop policy if exists "community_lists_update" on public.community_lists;
drop policy if exists "community_lists_delete" on public.community_lists;

create policy "community_lists_read" on public.community_lists
  for select to anon, authenticated using (true);
create policy "community_lists_insert" on public.community_lists
  for insert to authenticated with check (user_id = auth.uid());
create policy "community_lists_update" on public.community_lists
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Authors delete their own lists; admins can moderate any list.
create policy "community_lists_delete" on public.community_lists
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- Lists can be liked and commented like photos.
alter table public.likes drop constraint if exists likes_target_type_check;
alter table public.likes add constraint likes_target_type_check
  check (target_type in ('article', 'guide', 'comment', 'photo', 'list'));
alter table public.comments drop constraint if exists comments_target_type_check;
alter table public.comments add constraint comments_target_type_check
  check (target_type in ('article', 'guide', 'photo', 'list'));

-- Lists can say which tournament they were played at: a real tournament
-- (tournament_id) or free text for events not listed here. tournament_name
-- is always filled so search and display never need a join.
alter table public.community_lists add column if not exists tournament_id uuid
  references public.tournaments (id) on delete set null;
alter table public.community_lists add column if not exists tournament_name text;
create index if not exists idx_community_lists_tournament on public.community_lists (tournament_id);

-- ============================================================
-- Competitivo: tournament attendance ("Asistiré")
-- ============================================================
create table if not exists public.tournament_attendees (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create index if not exists idx_tournament_attendees_user on public.tournament_attendees (user_id);

alter table public.tournaments add column if not exists attendee_count integer not null default 0;

alter table public.tournament_attendees enable row level security;

drop policy if exists "tournament_attendees_read" on public.tournament_attendees;
drop policy if exists "tournament_attendees_insert" on public.tournament_attendees;
drop policy if exists "tournament_attendees_delete" on public.tournament_attendees;

-- The attendee list is public; people only sign themselves up or out.
create policy "tournament_attendees_read" on public.tournament_attendees
  for select to anon, authenticated using (true);
create policy "tournament_attendees_insert" on public.tournament_attendees
  for insert to authenticated with check (user_id = auth.uid());
create policy "tournament_attendees_delete" on public.tournament_attendees
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- Rejects sign-ups for finished or full tournaments. Locks the tournament
-- row so two people can't take the last spot at the same time.
create or replace function public.check_tournament_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  select status, max_players, attendee_count into t
    from public.tournaments where id = new.tournament_id for update;
  if not found then
    raise exception 'Torneo no encontrado';
  end if;
  if t.status = 'finished' then
    raise exception 'El torneo ya ha terminado';
  end if;
  if t.max_players is not null and t.attendee_count >= t.max_players then
    raise exception 'No quedan plazas en este torneo';
  end if;
  return new;
end;
$$;

drop trigger if exists tournament_attendance_check on public.tournament_attendees;
create trigger tournament_attendance_check
  before insert on public.tournament_attendees
  for each row execute function public.check_tournament_attendance();

create or replace function public.recalc_attendee_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t_id uuid;
begin
  t_id := coalesce(new.tournament_id, old.tournament_id);
  update public.tournaments
    set attendee_count = (select count(*) from public.tournament_attendees where tournament_id = t_id)
    where id = t_id;
  return null;
end;
$$;

drop trigger if exists tournament_attendance_count on public.tournament_attendees;
create trigger tournament_attendance_count
  after insert or delete on public.tournament_attendees
  for each row execute function public.recalc_attendee_count();

-- ============================================================
-- Notifications (friend requests, likes and comments)
-- ============================================================
-- Rows are written only by the security-definer triggers below; users can
-- read, mark as read and delete their own. entity_id points at the row that
-- caused the notification (friendship, like or comment) so undoing the action
-- removes it again.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete cascade,
  type text not null
    check (type in ('friend_request', 'friend_accepted', 'like', 'comment', 'comment_like')),
  -- What the notification links to: article | guide | photo | list.
  target_type text,
  target_id uuid,
  entity_id uuid,
  excerpt text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user
  on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread
  on public.notifications (user_id) where read_at is null;
create index if not exists idx_notifications_entity
  on public.notifications (entity_id);

alter table public.notifications enable row level security;

drop policy if exists "notifications_read" on public.notifications;
drop policy if exists "notifications_delete" on public.notifications;

create policy "notifications_read" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications_delete" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Marks the given notifications (or all of them when ids is null) as read.
create or replace function public.mark_notifications_read(ids uuid[] default null)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
    set read_at = now()
    where user_id = auth.uid()
      and read_at is null
      and (ids is null or id = any (ids));
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- Owner and a short label of a likeable/commentable item.
create or replace function public.notification_target(
  p_type text, p_id uuid, out owner_id uuid, out label text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  case p_type
    when 'photo' then
      select user_id, coalesce(nullif(title, ''), caption) into owner_id, label
        from public.shared_photos where id = p_id;
    when 'list' then
      select user_id, title into owner_id, label from public.community_lists where id = p_id;
    when 'guide' then
      select user_id, title into owner_id, label from public.painting_guides where id = p_id;
    when 'article' then
      select author_id, title into owner_id, label from public.articles where id = p_id;
    else
      null;
  end case;
end;
$$;

revoke all on function public.notification_target(text, uuid) from public, anon, authenticated;

create or replace function public.notify_friendship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, actor_id, type, entity_id)
      values (new.addressee_id, new.requester_id, 'friend_request', new.id);
  elsif tg_op = 'UPDATE' then
    if old.status = 'pending' and new.status = 'accepted' then
      insert into public.notifications (user_id, actor_id, type, entity_id)
        values (new.requester_id, new.addressee_id, 'friend_accepted', new.id);
      update public.notifications set read_at = coalesce(read_at, now())
        where entity_id = new.id and type = 'friend_request';
    end if;
  elsif tg_op = 'DELETE' then
    -- A cancelled or rejected request shouldn't linger in the list.
    delete from public.notifications
      where entity_id = old.id and type = 'friend_request';
  end if;
  return null;
end;
$$;

drop trigger if exists friendships_notify on public.friendships;
create trigger friendships_notify
  after insert or update or delete on public.friendships
  for each row execute function public.notify_friendship();

create or replace function public.notify_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_label text;
  v_type text := 'like';
  v_target_type text := new.target_type;
  v_target_id uuid := new.target_id;
begin
  if new.target_type = 'comment' then
    select user_id, content, target_type, target_id
      into v_owner, v_label, v_target_type, v_target_id
      from public.comments where id = new.target_id;
    v_type := 'comment_like';
  else
    select t.owner_id, t.label into v_owner, v_label
      from public.notification_target(new.target_type, new.target_id) t;
  end if;

  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, target_type, target_id, entity_id, excerpt)
      values (v_owner, new.user_id, v_type, v_target_type, v_target_id, new.id, left(coalesce(v_label, ''), 140));
  end if;
  return null;
end;
$$;

drop trigger if exists likes_notify on public.likes;
create trigger likes_notify
  after insert on public.likes
  for each row execute function public.notify_like();

create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select t.owner_id into v_owner
    from public.notification_target(new.target_type, new.target_id) t;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, target_type, target_id, entity_id, excerpt)
      values (v_owner, new.user_id, 'comment', new.target_type, new.target_id, new.id, left(new.content, 140));
  end if;
  return null;
end;
$$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_comment();

-- Un-liking or deleting a comment withdraws its notification if unread.
create or replace function public.withdraw_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications where entity_id = old.id and read_at is null;
  return null;
end;
$$;

drop trigger if exists likes_withdraw_notification on public.likes;
create trigger likes_withdraw_notification
  after delete on public.likes
  for each row execute function public.withdraw_notification();

drop trigger if exists comments_withdraw_notification on public.comments;
create trigger comments_withdraw_notification
  after delete on public.comments
  for each row execute function public.withdraw_notification();

-- Stream new notifications to the recipient (RLS still applies).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end$$;

-- ============================================================
-- Email: preferences, activity, automations and campaign log
-- ============================================================
-- Emails are sent by the /api/email Vercel function with the service role
-- key; nothing here lets a normal user read other people's addresses.
alter table public.profiles add column if not exists email_updates boolean not null default true;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists last_reminder_at timestamptz;

alter table public.app_config add column if not exists reengagement_enabled boolean not null default false;
alter table public.app_config add column if not exists reengagement_days integer not null default 14;
alter table public.app_config add column if not exists reengagement_cooldown_days integer not null default 30;

-- The app calls this when a signed-in user opens it (throttled client-side).
create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
    set last_seen_at = now()
    where id = auth.uid()
      and (last_seen_at is null or last_seen_at < now() - interval '1 hour');
$$;

revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('manual', 'automatic', 'test')),
  template text not null,
  subject text not null,
  audience text not null default '',
  recipients integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_campaigns_created on public.email_campaigns (created_at desc);

alter table public.email_campaigns enable row level security;

drop policy if exists "email_campaigns_read" on public.email_campaigns;
-- Admins read the log; only the server (service role) writes it.
create policy "email_campaigns_read" on public.email_campaigns
  for select to authenticated using (public.is_admin());

-- Who can receive an email: confirmed address, email_updates on, and
-- optionally inactive for N days / not reminded in the last M days.
create or replace function public.email_audience(
  p_inactive_days integer default null,
  p_cooldown_days integer default null
)
returns table (user_id uuid, email text, display_name text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id, u.email::text, coalesce(p.display_name, '')
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.email_updates
    and u.email is not null
    and u.email_confirmed_at is not null
    and (
      p_inactive_days is null
      or coalesce(p.last_seen_at, u.last_sign_in_at, u.created_at) < now() - make_interval(days => p_inactive_days)
    )
    and (
      p_cooldown_days is null
      or p.last_reminder_at is null
      or p.last_reminder_at < now() - make_interval(days => p_cooldown_days)
    )
  order by u.created_at
$$;

revoke all on function public.email_audience(integer, integer) from public, anon, authenticated;
grant execute on function public.email_audience(integer, integer) to service_role;

-- Audience size for the admin panel (no addresses leave the database).
create or replace function public.admin_email_audience_count(p_inactive_days integer default null)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo administradores';
  end if;
  return (select count(*)::int from public.email_audience(p_inactive_days, null));
end;
$$;

revoke all on function public.admin_email_audience_count(integer) from public, anon;
grant execute on function public.admin_email_audience_count(integer) to authenticated;

-- External contacts: people who are not users but agreed to receive
-- Administratum emails (LSSI art. 21 requires that prior consent, and the
-- GDPR requires being able to prove it — hence `source`). Addresses that
-- unsubscribe go to email_suppressions and are never emailed again, even if
-- someone adds them back.
create table if not exists public.email_contacts (
  email text primary key check (email = lower(email)),
  source text not null check (char_length(trim(source)) between 3 and 300),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_suppressions (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.email_contacts enable row level security;
alter table public.email_suppressions enable row level security;

drop policy if exists "email_contacts_read" on public.email_contacts;
drop policy if exists "email_contacts_delete" on public.email_contacts;
-- Admins read and remove contacts directly; listing with status and adding
-- go through the RPCs below (they need auth.users to tell contacts and
-- users apart). Suppressions have no policies: only the server touches them.
create policy "email_contacts_read" on public.email_contacts
  for select to authenticated using (public.is_admin());
create policy "email_contacts_delete" on public.email_contacts
  for delete to authenticated using (public.is_admin());

-- 'activo' can be emailed; 'baja' unsubscribed; 'usuario' has since signed
-- up (they get emails through their own preferences instead).
create or replace function public.email_contact_status(p_email text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select case
    when exists (select 1 from public.email_suppressions s where s.email = p_email) then 'baja'
    when exists (select 1 from auth.users u where lower(u.email) = p_email) then 'usuario'
    else 'activo'
  end
$$;

revoke all on function public.email_contact_status(text) from public, anon, authenticated;

create or replace function public.admin_email_contacts()
returns table (email text, source text, created_at timestamptz, status text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo administradores';
  end if;
  return query
    select c.email, c.source, c.created_at, public.email_contact_status(c.email)
    from public.email_contacts c
    order by c.created_at desc, c.email;
end;
$$;

revoke all on function public.admin_email_contacts() from public, anon;
grant execute on function public.admin_email_contacts() to authenticated;

-- Adds addresses with their consent source and reports what happened to
-- each one: 'añadido', 'existente', 'usuario', 'baja' or 'inválido'.
create or replace function public.admin_add_email_contacts(p_emails text[], p_source text)
returns table (email text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  addr text;
  st text;
begin
  if not public.is_admin() then
    raise exception 'Solo administradores';
  end if;
  if char_length(trim(coalesce(p_source, ''))) < 3 then
    raise exception 'Indica cómo dieron su consentimiento';
  end if;
  if coalesce(array_length(p_emails, 1), 0) > 500 then
    raise exception 'Máximo 500 direcciones por vez';
  end if;
  for addr in select distinct lower(trim(e)) from unnest(p_emails) e where trim(e) <> '' loop
    if addr !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(addr) > 254 then
      st := 'inválido';
    else
      st := public.email_contact_status(addr);
      if st = 'activo' then
        insert into public.email_contacts (email, source, created_by)
          values (addr, trim(p_source), auth.uid())
          on conflict on constraint email_contacts_pkey do nothing;
        st := case when found then 'añadido' else 'existente' end;
      end if;
    end if;
    email := addr;
    status := st;
    return next;
  end loop;
end;
$$;

revoke all on function public.admin_add_email_contacts(text[], text) from public, anon;
grant execute on function public.admin_add_email_contacts(text[], text) to authenticated;

-- Who already got each manual campaign (keyed by template + subject), so
-- sending it again — e.g. the next day, after hitting the daily limit —
-- only reaches the people still missing it. Server only.
create table if not exists public.email_deliveries (
  campaign_key text not null,
  email text not null,
  sent_at timestamptz not null default now(),
  primary key (campaign_key, email)
);

alter table public.email_deliveries enable row level security;

create or replace function public.email_undelivered(p_campaign_key text, p_emails text[])
returns table (email text)
language sql
stable
security definer
set search_path = public
as $$
  select e from unnest(p_emails) with ordinality as t(e, n)
  where not exists (
    select 1 from public.email_deliveries d
    where d.campaign_key = p_campaign_key and d.email = lower(t.e)
  )
  order by n
$$;

revoke all on function public.email_undelivered(text, text[]) from public, anon, authenticated;
grant execute on function public.email_undelivered(text, text[]) to service_role;

-- Sendable external contacts, for the server only.
create or replace function public.email_contact_audience()
returns table (email text)
language sql
stable
security definer
set search_path = public
as $$
  select c.email from public.email_contacts c
  where public.email_contact_status(c.email) = 'activo'
  order by c.created_at
$$;

revoke all on function public.email_contact_audience() from public, anon, authenticated;
grant execute on function public.email_contact_audience() to service_role;

-- ============================================================
-- Teams: invite-only groups with a board, list sharing and group chat
-- ============================================================
-- Anyone can see that a team exists and who is in it; joining needs an
-- invitation from the owner or an admin of the team. The board, comments
-- and chat are visible only to members.
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 60),
  description text not null default '' check (char_length(description) <= 1000),
  emblem text,
  banner text,
  location text not null default '' check (char_length(location) <= 80),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.teams;
create trigger set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists idx_team_members_user on public.team_members (user_id);

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  invited_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index if not exists idx_team_invitations_user on public.team_invitations (user_id);

create table if not exists public.team_posts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'post' check (kind in ('post', 'list')),
  body text not null default '' check (char_length(body) <= 4000),
  image text,
  -- kind = 'list': an army list shared with the team for feedback.
  list_title text,
  list_data jsonb,
  pinned boolean not null default false,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  check (kind <> 'list' or list_data is not null),
  check (kind <> 'post' or char_length(trim(body)) > 0 or image is not null)
);

create index if not exists idx_team_posts_team on public.team_posts (team_id, pinned desc, created_at desc);

create table if not exists public.team_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.team_posts (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_team_post_comments_post on public.team_post_comments (post_id, created_at);

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_team_messages_team on public.team_messages (team_id, created_at desc);

-- Role of the current user in a team (null if not a member).
create or replace function public.team_role(p_team uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.team_members where team_id = p_team and user_id = auth.uid()
$$;

create or replace function public.is_team_member(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.team_role(p_team) is not null
$$;

create or replace function public.is_team_manager(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.team_role(p_team) in ('owner', 'admin'), false)
$$;

revoke all on function public.team_role(uuid) from public, anon;
revoke all on function public.is_team_member(uuid) from public, anon;
revoke all on function public.is_team_manager(uuid) from public, anon;
grant execute on function public.team_role(uuid) to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_manager(uuid) to authenticated;

-- The creator becomes the owner; member_count follows the roster.
create or replace function public.team_add_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_members (team_id, user_id, role) values (new.id, new.created_by, 'owner');
  return null;
end;
$$;

drop trigger if exists teams_add_owner on public.teams;
create trigger teams_add_owner after insert on public.teams
  for each row execute function public.team_add_owner();

create or replace function public.team_recount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t uuid := coalesce(new.team_id, old.team_id);
begin
  update public.teams set member_count = (select count(*) from public.team_members where team_id = t) where id = t;
  return null;
end;
$$;

drop trigger if exists team_members_recount on public.team_members;
create trigger team_members_recount after insert or delete on public.team_members
  for each row execute function public.team_recount();

create or replace function public.team_post_recount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p uuid := coalesce(new.post_id, old.post_id);
begin
  update public.team_posts set comment_count = (select count(*) from public.team_post_comments where post_id = p) where id = p;
  return null;
end;
$$;

drop trigger if exists team_post_comments_recount on public.team_post_comments;
create trigger team_post_comments_recount after insert or delete on public.team_post_comments
  for each row execute function public.team_post_recount();

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;
alter table public.team_posts enable row level security;
alter table public.team_post_comments enable row level security;
alter table public.team_messages enable row level security;

drop policy if exists "teams_read" on public.teams;
drop policy if exists "teams_insert" on public.teams;
drop policy if exists "teams_update" on public.teams;
drop policy if exists "teams_delete" on public.teams;
create policy "teams_read" on public.teams for select to anon, authenticated using (true);
create policy "teams_insert" on public.teams for insert to authenticated with check (created_by = auth.uid());
create policy "teams_update" on public.teams for update to authenticated
  using (public.is_team_manager(id)) with check (public.is_team_manager(id));
create policy "teams_delete" on public.teams for delete to authenticated
  using (public.team_role(id) = 'owner' or public.is_admin());

drop policy if exists "team_members_read" on public.team_members;
drop policy if exists "team_members_delete" on public.team_members;
create policy "team_members_read" on public.team_members for select to anon, authenticated using (true);
-- Leave the team, or a manager removes someone; the owner can't be removed
-- (they delete the team instead). Joining and role changes go through RPCs.
create policy "team_members_delete" on public.team_members for delete to authenticated
  using (role <> 'owner' and (user_id = auth.uid() or public.is_team_manager(team_id)));

drop policy if exists "team_invitations_read" on public.team_invitations;
drop policy if exists "team_invitations_insert" on public.team_invitations;
drop policy if exists "team_invitations_delete" on public.team_invitations;
create policy "team_invitations_read" on public.team_invitations for select to authenticated
  using (user_id = auth.uid() or public.is_team_manager(team_id));
create policy "team_invitations_insert" on public.team_invitations for insert to authenticated
  with check (
    invited_by = auth.uid()
    and public.is_team_manager(team_id)
    and not exists (select 1 from public.team_members m where m.team_id = team_invitations.team_id and m.user_id = team_invitations.user_id)
  );
-- The invitee declines, or a manager withdraws it.
create policy "team_invitations_delete" on public.team_invitations for delete to authenticated
  using (user_id = auth.uid() or public.is_team_manager(team_id));

drop policy if exists "team_posts_read" on public.team_posts;
drop policy if exists "team_posts_insert" on public.team_posts;
drop policy if exists "team_posts_update" on public.team_posts;
drop policy if exists "team_posts_delete" on public.team_posts;
create policy "team_posts_read" on public.team_posts for select to authenticated using (public.is_team_member(team_id));
create policy "team_posts_insert" on public.team_posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_team_member(team_id) and (not pinned or public.is_team_manager(team_id)));
create policy "team_posts_update" on public.team_posts for update to authenticated
  using (author_id = auth.uid() or public.is_team_manager(team_id))
  with check (public.is_team_member(team_id) and (not pinned or public.is_team_manager(team_id)));
create policy "team_posts_delete" on public.team_posts for delete to authenticated
  using (author_id = auth.uid() or public.is_team_manager(team_id));

drop policy if exists "team_post_comments_read" on public.team_post_comments;
drop policy if exists "team_post_comments_insert" on public.team_post_comments;
drop policy if exists "team_post_comments_delete" on public.team_post_comments;
create policy "team_post_comments_read" on public.team_post_comments for select to authenticated using (public.is_team_member(team_id));
create policy "team_post_comments_insert" on public.team_post_comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_team_member(team_id)
    and exists (select 1 from public.team_posts p where p.id = post_id and p.team_id = team_post_comments.team_id)
  );
create policy "team_post_comments_delete" on public.team_post_comments for delete to authenticated
  using (author_id = auth.uid() or public.is_team_manager(team_id));

drop policy if exists "team_messages_read" on public.team_messages;
drop policy if exists "team_messages_insert" on public.team_messages;
create policy "team_messages_read" on public.team_messages for select to authenticated using (public.is_team_member(team_id));
create policy "team_messages_insert" on public.team_messages for insert to authenticated
  with check (author_id = auth.uid() and public.is_team_member(team_id));

-- Accepting an invitation is the only way into a team.
create or replace function public.accept_team_invitation(p_invitation uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.team_invitations;
begin
  select * into inv from public.team_invitations where id = p_invitation and user_id = auth.uid();
  if inv.id is null then
    raise exception 'Invitación no encontrada';
  end if;
  insert into public.team_members (team_id, user_id) values (inv.team_id, inv.user_id)
    on conflict do nothing;
  delete from public.team_invitations where id = inv.id;
  return inv.team_id;
end;
$$;

revoke all on function public.accept_team_invitation(uuid) from public, anon;
grant execute on function public.accept_team_invitation(uuid) to authenticated;

-- Only the owner promotes/demotes admins, or hands the team over.
create or replace function public.set_team_role(p_team uuid, p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.team_role(p_team) is distinct from 'owner' then
    raise exception 'Solo el creador del equipo puede cambiar los roles';
  end if;
  if p_role not in ('owner', 'admin', 'member') or p_user = auth.uid() then
    raise exception 'Cambio de rol no válido';
  end if;
  if not exists (select 1 from public.team_members where team_id = p_team and user_id = p_user) then
    raise exception 'No es miembro del equipo';
  end if;
  if p_role = 'owner' then
    update public.team_members set role = 'admin' where team_id = p_team and user_id = auth.uid();
    update public.teams set created_by = p_user where id = p_team;
  end if;
  update public.team_members set role = p_role where team_id = p_team and user_id = p_user;
end;
$$;

revoke all on function public.set_team_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_team_role(uuid, uuid, text) to authenticated;

-- Live team chat (RLS still applies).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_messages'
  ) then
    alter publication supabase_realtime add table public.team_messages;
  end if;
end$$;

-- ============================================================
-- Open games ("partidas"): find an opponent nearby
-- ============================================================
-- A host publishes a game (where, when, army, level) and others join until
-- it is full. Listings are public; the exact address of a home game and the
-- game chat are only for the players.
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 80),
  description text not null default '' check (char_length(description) <= 1000),
  format text not null default 'equilibrado'
    check (format in ('equilibrado', 'cruzada', 'narrativo', 'patrulla', 'incursion', 'otro')),
  points_limit integer check (points_limit between 0 and 10000),
  host_faction text,
  level text not null default 'casual' check (level in ('iniciacion', 'casual', 'intermedio', 'competitivo')),
  venue_type text not null check (venue_type in ('online', 'tienda', 'club', 'casa', 'otro')),
  venue_name text not null default '' check (char_length(venue_name) <= 120),
  city text not null default '' check (char_length(city) <= 80),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  starts_on date not null,
  time_mode text not null default 'fixed' check (time_mode in ('fixed', 'flexible')),
  start_time time,
  end_time time,
  time_note text not null default '' check (char_length(time_note) <= 80),
  max_players integer not null default 2 check (max_players between 2 and 8),
  player_count integer not null default 0,
  status text not null default 'open' check (status in ('open', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (time_mode <> 'fixed' or start_time is not null),
  check (venue_type = 'online' or (lat is not null and lng is not null))
);

create index if not exists idx_matches_upcoming on public.matches (starts_on) where status = 'open';
create index if not exists idx_matches_host on public.matches (host_id);

drop trigger if exists set_updated_at on public.matches;
create trigger set_updated_at before update on public.matches
  for each row execute function public.set_updated_at();

create table if not exists public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  faction text,
  joined_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create index if not exists idx_match_players_user on public.match_players (user_id);

-- Exact address (a home game, a club's street), for the players only.
create table if not exists public.match_private (
  match_id uuid primary key references public.matches (id) on delete cascade,
  address text not null default '' check (char_length(address) <= 300)
);

create table if not exists public.match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_match_messages_match on public.match_messages (match_id, created_at);

create or replace function public.is_match_player(p_match uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.match_players where match_id = p_match and user_id = auth.uid())
$$;

revoke all on function public.is_match_player(uuid) from public, anon;
grant execute on function public.is_match_player(uuid) to authenticated;

-- Home games never publish a precise point: ~1 km is enough to list them
-- by distance without giving away where someone lives.
create or replace function public.match_blur_location()
returns trigger
language plpgsql
as $$
begin
  if new.venue_type = 'casa' and new.lat is not null then
    new.lat := round(new.lat::numeric, 2)::double precision;
    new.lng := round(new.lng::numeric, 2)::double precision;
  end if;
  if new.venue_type = 'online' then
    new.lat := null;
    new.lng := null;
  end if;
  return new;
end;
$$;

drop trigger if exists matches_blur_location on public.matches;
create trigger matches_blur_location before insert or update on public.matches
  for each row execute function public.match_blur_location();

create or replace function public.match_add_host()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.match_players (match_id, user_id, faction) values (new.id, new.host_id, new.host_faction);
  return null;
end;
$$;

drop trigger if exists matches_add_host on public.matches;
create trigger matches_add_host after insert on public.matches
  for each row execute function public.match_add_host();

create or replace function public.match_recount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m uuid := coalesce(new.match_id, old.match_id);
begin
  update public.matches set player_count = (select count(*) from public.match_players where match_id = m) where id = m;
  return null;
end;
$$;

drop trigger if exists match_players_recount on public.match_players;
create trigger match_players_recount after insert or delete on public.match_players
  for each row execute function public.match_recount();

-- Can the current user take a seat? Open, not full, not in the past.
create or replace function public.can_join_match(p_match uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match and m.status = 'open' and m.starts_on >= current_date and m.player_count < m.max_players
  )
$$;

revoke all on function public.can_join_match(uuid) from public, anon;
grant execute on function public.can_join_match(uuid) to authenticated;

alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_private enable row level security;
alter table public.match_messages enable row level security;

drop policy if exists "matches_read" on public.matches;
drop policy if exists "matches_insert" on public.matches;
drop policy if exists "matches_update" on public.matches;
drop policy if exists "matches_delete" on public.matches;
create policy "matches_read" on public.matches for select to anon, authenticated using (true);
create policy "matches_insert" on public.matches for insert to authenticated
  with check (host_id = auth.uid() and starts_on >= current_date);
create policy "matches_update" on public.matches for update to authenticated
  using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "matches_delete" on public.matches for delete to authenticated using (host_id = auth.uid() or public.is_admin());

drop policy if exists "match_players_read" on public.match_players;
drop policy if exists "match_players_insert" on public.match_players;
drop policy if exists "match_players_update" on public.match_players;
drop policy if exists "match_players_delete" on public.match_players;
create policy "match_players_read" on public.match_players for select to anon, authenticated using (true);
create policy "match_players_insert" on public.match_players for insert to authenticated
  with check (user_id = auth.uid() and public.can_join_match(match_id));
create policy "match_players_update" on public.match_players for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Leave (not the host: they cancel instead), or the host removes someone.
create policy "match_players_delete" on public.match_players for delete to authenticated
  using (
    (user_id = auth.uid() and not exists (select 1 from public.matches m where m.id = match_id and m.host_id = auth.uid()))
    or exists (select 1 from public.matches m where m.id = match_id and m.host_id = auth.uid() and m.host_id <> match_players.user_id)
  );

drop policy if exists "match_private_read" on public.match_private;
drop policy if exists "match_private_write" on public.match_private;
create policy "match_private_read" on public.match_private for select to authenticated using (public.is_match_player(match_id));
create policy "match_private_write" on public.match_private for all to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id and m.host_id = auth.uid()))
  with check (exists (select 1 from public.matches m where m.id = match_id and m.host_id = auth.uid()));

drop policy if exists "match_messages_read" on public.match_messages;
drop policy if exists "match_messages_insert" on public.match_messages;
create policy "match_messages_read" on public.match_messages for select to authenticated using (public.is_match_player(match_id));
create policy "match_messages_insert" on public.match_messages for insert to authenticated
  with check (author_id = auth.uid() and public.is_match_player(match_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_messages'
  ) then
    alter publication supabase_realtime add table public.match_messages;
  end if;
end$$;

-- Upcoming open games by distance (km) from a point. Online games are
-- always included (distance null) unless p_include_online is false.
create or replace function public.nearby_matches(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_include_online boolean default true
)
returns table (id uuid, distance_km double precision)
language sql
stable
set search_path = public
as $$
  select m.id,
    case when p_lat is null or m.lat is null then null
      else 6371 * 2 * asin(sqrt(
        power(sin(radians(m.lat - p_lat) / 2), 2)
        + cos(radians(p_lat)) * cos(radians(m.lat)) * power(sin(radians(m.lng - p_lng) / 2), 2)
      ))
    end as distance_km
  from public.matches m
  where m.status = 'open'
    and m.starts_on >= current_date
    and (
      (m.venue_type = 'online' and p_include_online)
      or (m.venue_type <> 'online' and (
        p_lat is null or p_radius_km is null
        or 6371 * 2 * asin(sqrt(
          power(sin(radians(m.lat - p_lat) / 2), 2)
          + cos(radians(p_lat)) * cos(radians(m.lat)) * power(sin(radians(m.lng - p_lng) / 2), 2)
        )) <= p_radius_km
      ))
    )
  order by m.starts_on, distance_km nulls last
  limit 200
$$;

grant execute on function public.nearby_matches(double precision, double precision, double precision, boolean) to anon, authenticated;

-- ============================================================
-- Game invitations: a host can bring an opponent already agreed
-- ============================================================
-- Invite a registered player (notification + email) or any email address
-- (email with a link to sign up and accept). A pending invitation holds a
-- seat; `reserved_count` makes that visible in the public listing.
alter table public.matches add column if not exists reserved_count integer not null default 0;

create table if not exists public.match_invitations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  invited_user uuid references auth.users (id) on delete cascade,
  email text check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  invited_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Secret for the link in external invitations (two random UUIDs, 244 bits).
  token text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Who it is for: a user, an email, or both once an emailed invitation is
-- accepted (the address stays as a record).
alter table public.match_invitations drop constraint if exists match_invitations_target_check;
alter table public.match_invitations add constraint match_invitations_target_check
  check (invited_user is not null or email is not null);

create unique index if not exists match_invitations_user_key on public.match_invitations (match_id, invited_user) where invited_user is not null;
create unique index if not exists match_invitations_email_key on public.match_invitations (match_id, email) where email is not null;
create unique index if not exists match_invitations_token_key on public.match_invitations (token);
create index if not exists idx_match_invitations_user on public.match_invitations (invited_user) where status = 'pending';

-- Checks before an invitation is stored: the host's own open game, a free
-- seat, not already playing, a daily cap on emails to strangers, and an
-- address that belongs to a user becomes an invitation to that user.
create or replace function public.match_invitation_prepare()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  m public.matches;
  existing uuid;
begin
  new.email := nullif(lower(trim(new.email)), '');
  select * into m from public.matches where id = new.match_id;
  if m.id is null or m.host_id <> new.invited_by then
    raise exception 'Solo el organizador puede invitar a su partida';
  end if;
  if m.status <> 'open' or m.starts_on < current_date then
    raise exception 'La partida ya no admite invitaciones';
  end if;
  if new.email is not null then
    select id into existing from auth.users where lower(email) = new.email limit 1;
    if existing is not null then
      new.invited_user := existing;
      new.email := null;
    elsif (
      select count(*) from public.match_invitations
      where invited_by = new.invited_by and email is not null and created_at > now() - interval '1 day'
    ) >= 10 then
      raise exception 'Has alcanzado el límite de 10 invitaciones por correo al día';
    end if;
  end if;
  if new.invited_user = m.host_id then
    raise exception 'No puedes invitarte a ti mismo';
  end if;
  if new.invited_user is not null and exists (
    select 1 from public.match_players where match_id = m.id and user_id = new.invited_user
  ) then
    raise exception 'Ese jugador ya está en la partida';
  end if;
  if m.player_count + m.reserved_count >= m.max_players then
    raise exception 'No quedan plazas libres en la partida';
  end if;
  return new;
end;
$$;

drop trigger if exists match_invitations_prepare on public.match_invitations;
create trigger match_invitations_prepare before insert on public.match_invitations
  for each row execute function public.match_invitation_prepare();

create or replace function public.match_reserved_recount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m uuid := coalesce(new.match_id, old.match_id);
begin
  update public.matches
    set reserved_count = (select count(*) from public.match_invitations where match_id = m and status = 'pending')
    where id = m;
  return null;
end;
$$;

drop trigger if exists match_invitations_recount on public.match_invitations;
create trigger match_invitations_recount after insert or update or delete on public.match_invitations
  for each row execute function public.match_reserved_recount();

alter table public.match_invitations enable row level security;

drop policy if exists "match_invitations_read" on public.match_invitations;
drop policy if exists "match_invitations_insert" on public.match_invitations;
drop policy if exists "match_invitations_delete" on public.match_invitations;
-- The host sees all of a game's invitations; a player sees the ones for them.
-- Answering goes through the RPCs below (they also accept the email token).
create policy "match_invitations_read" on public.match_invitations for select to authenticated
  using (invited_user = auth.uid() or exists (select 1 from public.matches m where m.id = match_id and m.host_id = auth.uid()));
create policy "match_invitations_insert" on public.match_invitations for insert to authenticated
  with check (invited_by = auth.uid() and exists (select 1 from public.matches m where m.id = match_id and m.host_id = auth.uid()));
create policy "match_invitations_delete" on public.match_invitations for delete to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id and m.host_id = auth.uid()));

-- Joining with the normal button also answers your own invitation.
create or replace function public.match_player_claims_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.match_invitations set status = 'accepted'
    where match_id = new.match_id and invited_user = new.user_id and status = 'pending';
  return null;
end;
$$;

drop trigger if exists match_players_claim_invitation on public.match_players;
create trigger match_players_claim_invitation after insert on public.match_players
  for each row execute function public.match_player_claims_invitation();

-- Seats held by someone else's pending invitation are not free.
create or replace function public.can_join_match(p_match uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match and m.status = 'open' and m.starts_on >= current_date
      and m.player_count + (
        select count(*) from public.match_invitations i
        where i.match_id = m.id and i.status = 'pending' and i.invited_user is distinct from auth.uid()
      ) < m.max_players
  )
$$;

-- Accept by id (invited user) or by the email link's token (anyone signed in
-- who has the link): takes the reserved seat.
create or replace function public.accept_match_invitation(
  p_invitation uuid default null,
  p_token text default null,
  p_faction text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.match_invitations;
  m public.matches;
begin
  select * into inv from public.match_invitations
    where status = 'pending'
      and ((p_invitation is not null and id = p_invitation and invited_user = auth.uid())
        or (p_token is not null and token = p_token));
  if inv.id is null then
    raise exception 'Invitación no encontrada o ya respondida';
  end if;
  select * into m from public.matches where id = inv.match_id;
  if m.status <> 'open' or m.starts_on < current_date then
    raise exception 'La partida ya no está disponible';
  end if;
  if auth.uid() = m.host_id then
    raise exception 'Es tu propia partida';
  end if;
  update public.match_invitations set status = 'accepted', invited_user = auth.uid() where id = inv.id;
  insert into public.match_players (match_id, user_id, faction) values (m.id, auth.uid(), nullif(trim(p_faction), ''))
    on conflict (match_id, user_id) do nothing;
  return m.id;
end;
$$;

create or replace function public.decline_match_invitation(p_invitation uuid default null, p_token text default null)
returns void
language sql
security definer
set search_path = public
as $$
  update public.match_invitations set status = 'declined'
  where status = 'pending'
    and ((p_invitation is not null and id = p_invitation and invited_user = auth.uid())
      or (p_token is not null and token = p_token))
$$;

-- What the email link shows before signing in: whose game, and if it's still open.
create or replace function public.match_invitation_by_token(p_token text)
returns table (match_id uuid, host_name text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select i.match_id, coalesce(nullif(p.display_name, ''), 'Un jugador'), i.status
  from public.match_invitations i
  join public.matches m on m.id = i.match_id
  left join public.profiles p on p.id = m.host_id
  where i.token = p_token
$$;

revoke all on function public.accept_match_invitation(uuid, text, text) from public, anon;
revoke all on function public.decline_match_invitation(uuid, text) from public, anon;
grant execute on function public.accept_match_invitation(uuid, text, text) to authenticated;
grant execute on function public.decline_match_invitation(uuid, text) to authenticated;
grant execute on function public.match_invitation_by_token(text) to anon, authenticated;

-- Invitations still to email, with the address (server only).
create or replace function public.match_invitation_recipients(p_match uuid)
returns table (id uuid, email text, name text, token text, external boolean)
language sql
stable
security definer
set search_path = public, auth
as $$
  select i.id, coalesce(u.email::text, i.email), coalesce(p.display_name, ''), i.token, i.invited_user is null
  from public.match_invitations i
  left join auth.users u on u.id = i.invited_user
  left join public.profiles p on p.id = i.invited_user
  where i.match_id = p_match and i.status = 'pending' and i.emailed_at is null
    and (i.invited_user is not null or not exists (select 1 from public.email_suppressions s where s.email = i.email))
$$;

revoke all on function public.match_invitation_recipients(uuid) from public, anon, authenticated;
grant execute on function public.match_invitation_recipients(uuid) to service_role;

-- ============================================================
-- Notifications for teams and games
-- ============================================================
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accepted', 'like', 'comment', 'comment_like',
    'team_invite', 'team_joined', 'match_joined', 'match_left', 'match_cancelled', 'match_invite'
  ));

create or replace function public.notify_team_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, actor_id, type, target_type, target_id, entity_id, excerpt)
      select new.user_id, new.invited_by, 'team_invite', 'team', new.team_id, new.id, t.name
      from public.teams t where t.id = new.team_id;
  else
    delete from public.notifications where entity_id = old.id and type = 'team_invite';
  end if;
  return null;
end;
$$;

drop trigger if exists team_invitations_notify on public.team_invitations;
create trigger team_invitations_notify after insert or delete on public.team_invitations
  for each row execute function public.notify_team_invitation();

-- Tell the team's managers when someone joins (not the owner on creation).
create or replace function public.notify_team_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'owner' then
    return null;
  end if;
  insert into public.notifications (user_id, actor_id, type, target_type, target_id, excerpt)
    select m.user_id, new.user_id, 'team_joined', 'team', new.team_id, t.name
    from public.team_members m join public.teams t on t.id = m.team_id
    where m.team_id = new.team_id and m.role in ('owner', 'admin') and m.user_id <> new.user_id;
  return null;
end;
$$;

drop trigger if exists team_members_notify on public.team_members;
create trigger team_members_notify after insert on public.team_members
  for each row execute function public.notify_team_member();

create or replace function public.notify_match_player()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches;
begin
  select * into m from public.matches where id = coalesce(new.match_id, old.match_id);
  if m.id is null then
    return null;
  end if;
  if tg_op = 'INSERT' and new.user_id <> m.host_id then
    insert into public.notifications (user_id, actor_id, type, target_type, target_id, excerpt)
      values (m.host_id, new.user_id, 'match_joined', 'match', m.id, to_char(m.starts_on, 'DD/MM'));
  elsif tg_op = 'DELETE' and old.user_id <> m.host_id and old.user_id = auth.uid() then
    insert into public.notifications (user_id, actor_id, type, target_type, target_id, excerpt)
      values (m.host_id, old.user_id, 'match_left', 'match', m.id, to_char(m.starts_on, 'DD/MM'));
  end if;
  return null;
end;
$$;

drop trigger if exists match_players_notify on public.match_players;
create trigger match_players_notify after insert or delete on public.match_players
  for each row execute function public.notify_match_player();

create or replace function public.notify_match_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'open' and new.status = 'cancelled' then
    insert into public.notifications (user_id, actor_id, type, target_type, target_id, excerpt)
      select p.user_id, new.host_id, 'match_cancelled', 'match', new.id, to_char(new.starts_on, 'DD/MM')
      from public.match_players p where p.match_id = new.id and p.user_id <> new.host_id;
  end if;
  return null;
end;
$$;

drop trigger if exists matches_notify_cancelled on public.matches;
create trigger matches_notify_cancelled after update on public.matches
  for each row execute function public.notify_match_cancelled();

create or replace function public.notify_match_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.invited_user is not null then
    insert into public.notifications (user_id, actor_id, type, target_type, target_id, entity_id, excerpt)
      select new.invited_user, new.invited_by, 'match_invite', 'match', new.match_id, new.id, to_char(m.starts_on, 'DD/MM')
      from public.matches m where m.id = new.match_id;
  elsif tg_op = 'UPDATE' and new.status <> 'pending' then
    update public.notifications set read_at = coalesce(read_at, now()) where entity_id = new.id and type = 'match_invite';
  elsif tg_op = 'DELETE' then
    delete from public.notifications where entity_id = old.id and type = 'match_invite';
  end if;
  return null;
end;
$$;

drop trigger if exists match_invitations_notify on public.match_invitations;
create trigger match_invitations_notify after insert or update or delete on public.match_invitations
  for each row execute function public.notify_match_invitation();

-- ============================================================
-- Profile counters (defined last: reads tables from every section)
-- ============================================================
-- Friendships are private to the two people involved, so the public
-- friend count is exposed through this RPC.
drop function if exists public.profile_stats(uuid);
create function public.profile_stats(uid uuid)
returns table (friends integer, photos integer, guides integer, lists integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.friendships
       where status = 'accepted' and uid in (requester_id, addressee_id)),
    (select count(*)::int from public.shared_photos where user_id = uid),
    (select count(*)::int from public.painting_guides where user_id = uid and published),
    (select count(*)::int from public.community_lists where user_id = uid)
$$;

grant execute on function public.profile_stats(uuid) to anon, authenticated;

-- ============================================================
-- Admin overview (platform-wide counters for the admin dashboard)
-- ============================================================
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'admins', (select count(*) from public.profiles where role = 'admin') + 1,
    'photos', (select count(*) from public.shared_photos),
    'photos_7d', (select count(*) from public.shared_photos where created_at > now() - interval '7 days'),
    'lists', (select count(*) from public.community_lists),
    'lists_7d', (select count(*) from public.community_lists where created_at > now() - interval '7 days'),
    'featured_lists', (select count(*) from public.featured_lists),
    'comments_7d', (select count(*) from public.comments where created_at > now() - interval '7 days'),
    'likes_7d', (select count(*) from public.likes where created_at > now() - interval '7 days'),
    'tournaments_active', (select count(*) from public.tournaments where status <> 'finished'),
    'attendees', (select coalesce(sum(attendee_count), 0) from public.tournaments where status <> 'finished'),
    'tournaments_without_rules', (
      select count(*) from public.tournaments
      where status <> 'finished' and (rules is null or rules -> 'content' is null or jsonb_array_length(rules -> 'content') = 0)
    ),
    'articles', (select count(*) from public.articles where published),
    'drafts', (select count(*) from public.articles where not published),
    'guides', (select count(*) from public.painting_guides where published),
    'ads_active', (select count(*) from public.ads where active)
  );
end;
$$;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
