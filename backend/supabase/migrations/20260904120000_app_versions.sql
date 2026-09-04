-- Mobile store version gates: minimum (force) and latest (soft) per platform.

create table public.app_versions (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('android', 'ios')),
  latest_version text not null,
  minimum_version text not null,
  download_url text not null default '',
  release_notes text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index app_versions_platform_active_idx
  on public.app_versions (platform, is_active)
  where is_active = true;

-- At most one active row per platform.
create unique index app_versions_one_active_per_platform
  on public.app_versions (platform)
  where is_active = true;

create trigger app_versions_updated_at before update on public.app_versions
  for each row execute function public.set_updated_at();

alter table public.app_versions enable row level security;

-- Apps read the active row for their platform (guest / signed-in).
create policy "app_versions_read_active"
  on public.app_versions
  for select
  to authenticated, anon
  using (is_active = true);

-- Admin console: full CRUD (including inactive historical rows).
create policy "app_versions_admin_select"
  on public.app_versions
  for select
  to authenticated
  using (public.is_admin());

create policy "app_versions_admin_insert"
  on public.app_versions
  for insert
  to authenticated
  with check (public.is_admin());

create policy "app_versions_admin_update"
  on public.app_versions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "app_versions_admin_delete"
  on public.app_versions
  for delete
  to authenticated
  using (public.is_admin());

grant select on table public.app_versions to anon, authenticated, service_role;
grant insert, update, delete on table public.app_versions to authenticated, service_role;

comment on table public.app_versions is
  'Store version gates for Android/iOS. Mobile reads is_active=true; manage from admin console.';

-- Starter rows (inactive until admin fills store URLs and activates).
insert into public.app_versions (
  platform, latest_version, minimum_version, download_url, release_notes, is_active
) values
  ('android', '1.0.0', '1.0.0', '', 'Initial release', false),
  ('ios', '1.0.0', '1.0.0', '', 'Initial release', false);
