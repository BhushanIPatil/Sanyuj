-- Optional link on area notices (same idea as ads.cta_url, no click tracking).

alter table public.notices
  add column if not exists cta_label text,
  add column if not exists cta_url text;

comment on column public.notices.cta_url is 'External https URL or in-app path such as /app/explore.';
comment on column public.notices.cta_label is 'Button label for cta_url. Defaults to Open link in the apps if blank.';
