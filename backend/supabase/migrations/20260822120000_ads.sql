-- Brand collaboration / banner ads shown on the app home page.
-- Insert and edit rows from the Supabase Table Editor (no client writes).

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  title text not null,
  body text,
  cta_label text,
  cta_url text,
  image_url text,
  background text not null default 'linear-gradient(135deg,#2E86D6,#3B5BDB)',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ads_active_sort_idx on public.ads (is_active, sort_order)
  where is_active = true;

create trigger ads_updated_at before update on public.ads
  for each row execute function public.set_updated_at();

alter table public.ads enable row level security;

-- App reads active campaigns; create/update/delete via dashboard / SQL (service role).
create policy "ads_read_active"
  on public.ads
  for select
  to authenticated, anon
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

comment on table public.ads is 'Sponsored brand banners on the home page. Manage rows in the Table Editor.';
comment on column public.ads.background is 'CSS color or gradient used when image_url is empty.';
comment on column public.ads.cta_url is 'External https URL or in-app path such as /app/explore.';
