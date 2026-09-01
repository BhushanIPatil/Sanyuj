-- Admin accounts for the Sanyuj admin webapp.
-- 1. Create auth user in Supabase Dashboard (email + password).
-- 2. Insert matching row: insert into public.admins (id, email, full_name) values ('<user-uuid>', 'admin@example.com', 'Admin');

-- ---------- admins table ----------
create table public.admins (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admins_updated_at before update on public.admins
  for each row execute function public.set_updated_at();

alter table public.admins enable row level security;

-- Admins can read their own row (middleware / session check).
create policy "admins_read_own"
  on public.admins
  for select
  to authenticated
  using (id = auth.uid() and is_active = true);

-- ---------- is_admin() helper ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where id = auth.uid() and is_active = true
  );
$$;

-- ---------- profiles: admin read all ----------
create policy "profiles_admin_select"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

-- ---------- businesses: admin read all ----------
create policy "businesses_admin_select"
  on public.businesses
  for select
  to authenticated
  using (public.is_admin());

-- ---------- jobs: admin read all ----------
create policy "jobs_admin_select"
  on public.jobs
  for select
  to authenticated
  using (public.is_admin());

-- ---------- job_interests: admin read all ----------
create policy "job_interests_admin_select"
  on public.job_interests
  for select
  to authenticated
  using (public.is_admin());

-- ---------- live_sessions: admin read all ----------
create policy "live_sessions_admin_select"
  on public.live_sessions
  for select
  to authenticated
  using (public.is_admin());

-- ---------- ads: admin full CRUD ----------
create policy "ads_admin_select"
  on public.ads
  for select
  to authenticated
  using (public.is_admin());

create policy "ads_admin_insert"
  on public.ads
  for insert
  to authenticated
  with check (public.is_admin());

create policy "ads_admin_update"
  on public.ads
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "ads_admin_delete"
  on public.ads
  for delete
  to authenticated
  using (public.is_admin());

-- ---------- category_groups: admin full CRUD ----------
create policy "category_groups_admin_select"
  on public.category_groups
  for select
  to authenticated
  using (public.is_admin());

create policy "category_groups_admin_insert"
  on public.category_groups
  for insert
  to authenticated
  with check (public.is_admin());

create policy "category_groups_admin_update"
  on public.category_groups
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "category_groups_admin_delete"
  on public.category_groups
  for delete
  to authenticated
  using (public.is_admin());

-- ---------- categories: admin full CRUD ----------
create policy "categories_admin_select"
  on public.categories
  for select
  to authenticated
  using (public.is_admin());

create policy "categories_admin_insert"
  on public.categories
  for insert
  to authenticated
  with check (public.is_admin());

create policy "categories_admin_update"
  on public.categories
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories_admin_delete"
  on public.categories
  for delete
  to authenticated
  using (public.is_admin());

comment on table public.admins is 'Admin accounts for the Sanyuj admin webapp. Link each row to a Supabase Auth user.';
