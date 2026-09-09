-- Home carousel vs Offerly: only flagged ads appear on the home screen.
-- All active, in-window, geo-matching ads still appear in Offerly.

alter table public.ads
  add column if not exists is_home_screen boolean not null default true;

comment on column public.ads.is_home_screen is
  'When true, the ad also appears in the home screen carousel. Every visible ad appears in Offerly.';
