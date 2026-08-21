-- Dynamic category groups (super) + categories (sub),
-- replace enum FKs, drop landmarks, add live current_address on profiles.

-- ---------- category_groups (super categories) ----------
create table public.category_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- categories (sub categories) ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.category_groups (id) on delete cascade,
  slug text not null unique,
  name text not null,
  emoji text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index categories_group_idx on public.categories (group_id);
create index categories_active_idx on public.categories (is_active) where is_active = true;

-- Seed super categories (manage further rows from Supabase dashboard)
insert into public.category_groups (slug, name, sort_order) values
  ('food', 'Food', 1),
  ('services', 'Services', 2),
  ('daily', 'Daily', 3);

-- Seed subcategories under Services (matches previous enum values for data migration)
insert into public.categories (group_id, slug, name, emoji, sort_order)
select g.id, v.slug, v.name, v.emoji, v.sort_order
from public.category_groups g
cross join (
  values
    ('plumber', 'Plumber', '🔧', 1),
    ('electrician', 'Electrician', '⚡', 2),
    ('auto_cab', 'Auto & Cab', '🚗', 3),
    ('carpenter', 'Carpenter', '🔨', 4),
    ('travels', 'Travels', '🧳', 5),
    ('house_rent', 'House Rent', '🏠', 6)
) as v(slug, name, emoji, sort_order)
where g.slug = 'services';

-- Example food / daily subs (edit or add more in the dashboard)
insert into public.categories (group_id, slug, name, emoji, sort_order)
select g.id, v.slug, v.name, v.emoji, v.sort_order
from public.category_groups g
cross join (
  values
    ('restaurant', 'Restaurant', '🍽️', 1),
    ('tiffin', 'Tiffin', '🍱', 2),
    ('bakery', 'Bakery', '🥐', 3)
) as v(slug, name, emoji, sort_order)
where g.slug = 'food';

insert into public.categories (group_id, slug, name, emoji, sort_order)
select g.id, v.slug, v.name, v.emoji, v.sort_order
from public.category_groups g
cross join (
  values
    ('grocery', 'Grocery', '🛒', 1),
    ('milk', 'Milk', '🥛', 2),
    ('laundry', 'Laundry', '👕', 3)
) as v(slug, name, emoji, sort_order)
where g.slug = 'daily';

-- ---------- businesses: enum → category_id ----------
alter table public.businesses
  add column if not exists category_id uuid references public.categories (id);

update public.businesses b
set category_id = c.id
from public.categories c
where b.category_id is null
  and c.slug = b.category::text;

alter table public.businesses
  alter column category_id set not null;

alter table public.businesses
  drop column if exists category;

create index if not exists businesses_category_id_idx on public.businesses (category_id);

-- ---------- jobs: enum → category_id ----------
alter table public.jobs
  add column if not exists category_id uuid references public.categories (id);

update public.jobs j
set category_id = c.id
from public.categories c
where j.category_id is null
  and c.slug = j.category::text;

alter table public.jobs
  alter column category_id set not null;

alter table public.jobs
  drop column if exists category;

create index if not exists jobs_category_id_idx on public.jobs (category_id);

drop type if exists public.service_category;

-- ---------- drop landmarks ----------
alter table public.jobs
  drop constraint if exists jobs_landmark_id_fkey;
alter table public.jobs
  drop column if exists landmark_id;

alter table public.live_sessions
  drop constraint if exists live_sessions_landmark_id_fkey;
alter table public.live_sessions
  drop column if exists landmark_id;

drop policy if exists "landmarks_read" on public.landmarks;
drop table if exists public.landmarks;

-- ---------- live location on profile ----------
alter table public.profiles
  add column if not exists current_address text,
  add column if not exists current_lat double precision,
  add column if not exists current_lng double precision;

-- ---------- RLS for categories (dashboard / SQL uses elevated roles) ----------
alter table public.category_groups enable row level security;
alter table public.categories enable row level security;

create policy "category_groups_read"
  on public.category_groups
  for select
  to authenticated, anon
  using (true);

create policy "categories_read"
  on public.categories
  for select
  to authenticated, anon
  using (true);
