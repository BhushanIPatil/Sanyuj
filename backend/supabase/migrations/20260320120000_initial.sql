-- Sanyuj initial schema
-- Run via: supabase db push  OR  paste into SQL Editor

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type public.job_status as enum ('open', 'closed');
create type public.job_urgency as enum ('today', 'this_week', 'flexible');
create type public.interest_status as enum ('waiting', 'selected', 'closed', 'withdrawn');
create type public.service_category as enum (
  'plumber',
  'electrician',
  'auto_cab',
  'carpenter',
  'travels',
  'house_rent'
);

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text not null unique,
  full_name text,
  pincode text,
  address text,
  lat double precision,
  lng double precision,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- landmarks ----------
create table public.landmarks (
  id uuid primary key default gen_random_uuid(),
  pincode text not null,
  city text not null,
  name text not null,
  area_label text,
  created_at timestamptz not null default now()
);

create index landmarks_pincode_idx on public.landmarks (pincode);

-- ---------- businesses ----------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null,
  category public.service_category not null,
  photo_url text,
  rating numeric(3,2) not null default 4.50,
  jobs_done integer not null default 0,
  response_rate integer not null default 90,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_category_idx on public.businesses (category);

-- ---------- jobs ----------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  category public.service_category not null,
  title text not null,
  description text not null,
  budget_min integer,
  budget_max integer,
  urgency public.job_urgency not null default 'flexible',
  pincode text not null,
  landmark_id uuid references public.landmarks (id) on delete set null,
  status public.job_status not null default 'open',
  closed_with_business_id uuid references public.businesses (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_status_pincode_idx on public.jobs (status, pincode);
create index jobs_customer_idx on public.jobs (customer_id);

-- ---------- job interests ----------
create table public.job_interests (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  offered_amount integer,
  status public.interest_status not null default 'waiting',
  created_at timestamptz not null default now(),
  unique (job_id, business_id)
);

create index job_interests_business_idx on public.job_interests (business_id);

-- ---------- live sessions (Go Live) ----------
create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  pincode text not null,
  landmark_id uuid references public.landmarks (id) on delete set null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '2 hours'),
  is_active boolean not null default true
);

create index live_sessions_active_idx on public.live_sessions (is_active, pincode)
  where is_active = true;

-- ---------- OTP (service role only via RLS) ----------
create table public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);

create index otp_codes_phone_idx on public.otp_codes (phone, created_at desc);

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- ---------- auto profile on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (
    new.id,
    coalesce(new.phone, new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.landmarks enable row level security;
alter table public.businesses enable row level security;
alter table public.jobs enable row level security;
alter table public.job_interests enable row level security;
alter table public.live_sessions enable row level security;
alter table public.otp_codes enable row level security;

-- landmarks: public read
create policy "landmarks_read" on public.landmarks
  for select to authenticated, anon using (true);

-- profiles
create policy "profiles_read_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- businesses: anyone authenticated can read; owner writes
create policy "businesses_read" on public.businesses
  for select to authenticated using (true);
create policy "businesses_insert_own" on public.businesses
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "businesses_update_own" on public.businesses
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- jobs: customers manage own; providers see open jobs in their pincode area (all open for MVP)
create policy "jobs_read" on public.jobs
  for select to authenticated using (
    status = 'open'
    or customer_id = auth.uid()
    or exists (
      select 1 from public.businesses b
      where b.owner_id = auth.uid()
    )
  );
create policy "jobs_insert_own" on public.jobs
  for insert to authenticated with check (customer_id = auth.uid());
create policy "jobs_update_own" on public.jobs
  for update to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- interests
create policy "interests_read" on public.job_interests
  for select to authenticated using (
    exists (select 1 from public.jobs j where j.id = job_id and j.customer_id = auth.uid())
    or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy "interests_insert_owner" on public.job_interests
  for insert to authenticated with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy "interests_update_parties" on public.job_interests
  for update to authenticated using (
    exists (select 1 from public.jobs j where j.id = job_id and j.customer_id = auth.uid())
    or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

-- live sessions
create policy "live_read" on public.live_sessions
  for select to authenticated using (true);
create policy "live_insert_own" on public.live_sessions
  for insert to authenticated with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy "live_update_own" on public.live_sessions
  for update to authenticated using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

-- otp_codes: no direct client access (service role bypasses RLS)
-- (intentionally no policies for authenticated/anon)

-- ---------- seed landmarks (Jalgaon 425001) ----------
insert into public.landmarks (pincode, city, name, area_label) values
  ('425001', 'Jalgaon', 'Ring Road', 'Central Jalgaon'),
  ('425001', 'Jalgaon', 'MJ College Road', 'Near college'),
  ('425001', 'Jalgaon', 'Shivaji Nagar', 'Residential'),
  ('425001', 'Jalgaon', 'Mahabal Road', 'Near market'),
  ('425001', 'Jalgaon', 'Station Road', 'Near railway'),
  ('425001', 'Jalgaon', 'Golani Market', 'Market area');

-- ---------- storage ----------
insert into storage.buckets (id, name, public)
values ('business-photos', 'business-photos', true)
on conflict (id) do nothing;

create policy "business_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'business-photos');

create policy "business_photos_owner_upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "business_photos_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'business-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "business_photos_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
