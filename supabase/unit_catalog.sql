-- Catálogo global de unidades (Munitorum Field Manual).
-- Ejecutar en el editor SQL de Supabase después del schema principal.

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
  using ((auth.jwt() ->> 'email') = 'jlcaclosada@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jlcaclosada@gmail.com');

alter table public.miniatures
  add column if not exists catalog_unit_id uuid references public.unit_catalog (id) on delete set null;

alter table public.miniatures
  add column if not exists points_snapshot jsonb;
