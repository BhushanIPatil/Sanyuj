-- Soft-delete / active flags on every public table.
-- App queries and RLS only expose rows where is_active = true and is_deleted = false.

-- ---------- columns ----------
alter table public.profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists is_deleted boolean not null default false;

alter table public.businesses
  add column if not exists is_active boolean not null default true,
  add column if not exists is_deleted boolean not null default false;

alter table public.jobs
  add column if not exists is_active boolean not null default true,
  add column if not exists is_deleted boolean not null default false;

alter table public.job_interests
  add column if not exists is_active boolean not null default true,
  add column if not exists is_deleted boolean not null default false;

alter table public.live_sessions
  add column if not exists is_deleted boolean not null default false;

alter table public.otp_codes
  add column if not exists is_active boolean not null default true,
  add column if not exists is_deleted boolean not null default false;

alter table public.category_groups
  add column if not exists is_deleted boolean not null default false;

alter table public.categories
  add column if not exists is_deleted boolean not null default false;

alter table public.ads
  add column if not exists is_deleted boolean not null default false;

-- A deleted row cannot also be active.
alter table public.profiles drop constraint if exists profiles_active_deleted_chk;
alter table public.profiles
  add constraint profiles_active_deleted_chk check (not (is_deleted and is_active));

alter table public.businesses drop constraint if exists businesses_active_deleted_chk;
alter table public.businesses
  add constraint businesses_active_deleted_chk check (not (is_deleted and is_active));

alter table public.jobs drop constraint if exists jobs_active_deleted_chk;
alter table public.jobs
  add constraint jobs_active_deleted_chk check (not (is_deleted and is_active));

alter table public.job_interests drop constraint if exists job_interests_active_deleted_chk;
alter table public.job_interests
  add constraint job_interests_active_deleted_chk check (not (is_deleted and is_active));

alter table public.live_sessions drop constraint if exists live_sessions_active_deleted_chk;
alter table public.live_sessions
  add constraint live_sessions_active_deleted_chk check (not (is_deleted and is_active));

alter table public.otp_codes drop constraint if exists otp_codes_active_deleted_chk;
alter table public.otp_codes
  add constraint otp_codes_active_deleted_chk check (not (is_deleted and is_active));

alter table public.category_groups drop constraint if exists category_groups_active_deleted_chk;
alter table public.category_groups
  add constraint category_groups_active_deleted_chk check (not (is_deleted and is_active));

alter table public.categories drop constraint if exists categories_active_deleted_chk;
alter table public.categories
  add constraint categories_active_deleted_chk check (not (is_deleted and is_active));

alter table public.ads drop constraint if exists ads_active_deleted_chk;
alter table public.ads
  add constraint ads_active_deleted_chk check (not (is_deleted and is_active));

create index if not exists profiles_visible_idx
  on public.profiles (id) where is_active = true and is_deleted = false;
create index if not exists businesses_visible_idx
  on public.businesses (id) where is_active = true and is_deleted = false;
create index if not exists jobs_visible_idx
  on public.jobs (status, pincode) where is_active = true and is_deleted = false;
create index if not exists job_interests_visible_idx
  on public.job_interests (job_id, business_id) where is_active = true and is_deleted = false;

-- ---------- RLS: only live rows (own profile remains readable so middleware can sign deleted users out) ----------
drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated" on public.profiles
  for select to authenticated using (
    auth.uid() = id
    or (is_active = true and is_deleted = false)
  );

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (
    auth.uid() = id
    and is_active = true
    and is_deleted = false
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id and is_active = true and is_deleted = false)
  with check (auth.uid() = id and is_active = true and is_deleted = false);

drop policy if exists "businesses_read" on public.businesses;
create policy "businesses_read" on public.businesses
  for select to authenticated using (is_active = true and is_deleted = false);

drop policy if exists "businesses_insert_own" on public.businesses;
create policy "businesses_insert_own" on public.businesses
  for insert to authenticated with check (
    auth.uid() = owner_id
    and is_active = true
    and is_deleted = false
  );

drop policy if exists "businesses_update_own" on public.businesses;
create policy "businesses_update_own" on public.businesses
  for update to authenticated
  using (auth.uid() = owner_id and is_deleted = false)
  with check (auth.uid() = owner_id and is_deleted = false);

drop policy if exists "jobs_read" on public.jobs;
create policy "jobs_read" on public.jobs
  for select to authenticated using (
    is_active = true
    and is_deleted = false
    and (
      status = 'open'
      or customer_id = auth.uid()
      or exists (
        select 1 from public.businesses b
        where b.owner_id = auth.uid()
          and b.is_active = true
          and b.is_deleted = false
      )
    )
  );

drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own" on public.jobs
  for insert to authenticated with check (
    customer_id = auth.uid()
    and is_active = true
    and is_deleted = false
  );

drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own" on public.jobs
  for update to authenticated
  using (customer_id = auth.uid() and is_active = true and is_deleted = false)
  with check (customer_id = auth.uid() and is_active = true and is_deleted = false);

drop policy if exists "interests_read" on public.job_interests;
create policy "interests_read" on public.job_interests
  for select to authenticated using (
    is_active = true
    and is_deleted = false
    and (
      exists (
        select 1 from public.jobs j
        where j.id = job_id
          and j.customer_id = auth.uid()
          and j.is_active = true
          and j.is_deleted = false
      )
      or exists (
        select 1 from public.businesses b
        where b.id = business_id
          and b.owner_id = auth.uid()
          and b.is_active = true
          and b.is_deleted = false
      )
    )
  );

drop policy if exists "interests_insert_owner" on public.job_interests;
create policy "interests_insert_owner" on public.job_interests
  for insert to authenticated with check (
    is_active = true
    and is_deleted = false
    and exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.owner_id = auth.uid()
        and b.is_active = true
        and b.is_deleted = false
    )
  );

drop policy if exists "interests_update_parties" on public.job_interests;
create policy "interests_update_parties" on public.job_interests
  for update to authenticated
  using (
    is_deleted = false
    and (
      exists (
        select 1 from public.jobs j
        where j.id = job_id
          and j.customer_id = auth.uid()
          and j.is_active = true
          and j.is_deleted = false
      )
      or exists (
        select 1 from public.businesses b
        where b.id = business_id
          and b.owner_id = auth.uid()
          and b.is_active = true
          and b.is_deleted = false
      )
    )
  )
  with check (
    is_deleted = false
    and (
      exists (
        select 1 from public.jobs j
        where j.id = job_id
          and j.customer_id = auth.uid()
          and j.is_active = true
          and j.is_deleted = false
      )
      or exists (
        select 1 from public.businesses b
        where b.id = business_id
          and b.owner_id = auth.uid()
          and b.is_active = true
          and b.is_deleted = false
      )
    )
  );

drop policy if exists "live_read" on public.live_sessions;
create policy "live_read" on public.live_sessions
  for select to authenticated using (is_active = true and is_deleted = false);

drop policy if exists "live_insert_own" on public.live_sessions;
create policy "live_insert_own" on public.live_sessions
  for insert to authenticated with check (
    is_active = true
    and is_deleted = false
    and exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.owner_id = auth.uid()
        and b.is_active = true
        and b.is_deleted = false
    )
  );

drop policy if exists "live_update_own" on public.live_sessions;
create policy "live_update_own" on public.live_sessions
  for update to authenticated
  using (
    is_deleted = false
    and exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.owner_id = auth.uid()
        and b.is_active = true
        and b.is_deleted = false
    )
  )
  with check (
    is_deleted = false
    and exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.owner_id = auth.uid()
        and b.is_active = true
        and b.is_deleted = false
    )
  );

drop policy if exists "category_groups_read" on public.category_groups;
create policy "category_groups_read"
  on public.category_groups
  for select
  to authenticated, anon
  using (is_active = true and is_deleted = false);

drop policy if exists "categories_read" on public.categories;
create policy "categories_read"
  on public.categories
  for select
  to authenticated, anon
  using (is_active = true and is_deleted = false);

drop policy if exists "ads_read_active" on public.ads;
create policy "ads_read_active"
  on public.ads
  for select
  to authenticated, anon
  using (
    is_active = true
    and is_deleted = false
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );
