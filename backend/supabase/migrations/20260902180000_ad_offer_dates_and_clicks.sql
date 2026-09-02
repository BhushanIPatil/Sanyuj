-- Offer validity dates (shown in ad detail UI) are separate from starts_at/ends_at (when the banner runs).

alter table public.ads
  add column if not exists offer_starts_at timestamptz,
  add column if not exists offer_ends_at timestamptz;

comment on column public.ads.starts_at is 'When the banner starts showing on the home page.';
comment on column public.ads.ends_at is 'When the banner stops showing on the home page.';
comment on column public.ads.offer_starts_at is 'When the advertised offer begins (shown in ad detail).';
comment on column public.ads.offer_ends_at is 'When the advertised offer ends (shown in ad detail).';

-- Per-user click totals: one row per (ad_id, user_id), no created_at/updated_at.
create table public.ad_user_clicks (
  ad_id uuid not null references public.ads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  count integer not null default 1 check (count > 0),
  latest_clicked_at timestamptz not null default now(),
  primary key (ad_id, user_id)
);

create index ad_user_clicks_ad_idx on public.ad_user_clicks (ad_id);
create index ad_user_clicks_latest_idx on public.ad_user_clicks (latest_clicked_at desc);

alter table public.ad_user_clicks enable row level security;

create policy "ad_user_clicks_admin_select"
  on public.ad_user_clicks
  for select
  to authenticated
  using (public.is_admin());

create or replace function public.record_ad_click(p_ad_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;

  if not exists (
    select 1 from public.ads a
    where a.id = p_ad_id
      and a.is_active = true
      and a.is_deleted = false
      and (a.starts_at is null or a.starts_at <= now())
      and (a.ends_at is null or a.ends_at > now())
  ) then
    return;
  end if;

  insert into public.ad_user_clicks (ad_id, user_id, count, latest_clicked_at)
  values (p_ad_id, uid, 1, now())
  on conflict (ad_id, user_id)
  do update set
    count = ad_user_clicks.count + 1,
    latest_clicked_at = now();
end;
$$;

grant execute on function public.record_ad_click(uuid) to authenticated;

comment on table public.ad_user_clicks is 'Unique per user and ad: total clicks and latest click time.';
