-- Shared categories for Offerly ads and Notify (notices).
-- One table, distinguished by kind: 'offer' | 'notice'.
-- Example offer kinds: clothing, utensils. Example notice kinds: events, functions.

create table public.content_categories (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  slug text not null,
  name text not null,
  emoji text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_categories_kind_chk check (kind in ('offer', 'notice')),
  constraint content_categories_active_deleted_chk check (not (is_deleted and is_active))
);

create unique index content_categories_kind_slug_idx
  on public.content_categories (kind, slug)
  where is_deleted = false;

create index content_categories_kind_sort_idx
  on public.content_categories (kind, sort_order)
  where is_active = true and is_deleted = false;

create trigger content_categories_updated_at before update on public.content_categories
  for each row execute function public.set_updated_at();

alter table public.content_categories enable row level security;

create policy "content_categories_read"
  on public.content_categories
  for select
  to authenticated, anon
  using (is_active = true and is_deleted = false);

create policy "content_categories_admin_select"
  on public.content_categories
  for select
  to authenticated
  using (public.is_admin());

create policy "content_categories_admin_insert"
  on public.content_categories
  for insert
  to authenticated
  with check (public.is_admin());

create policy "content_categories_admin_update"
  on public.content_categories
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "content_categories_admin_delete"
  on public.content_categories
  for delete
  to authenticated
  using (public.is_admin());

grant select on table public.content_categories to anon, authenticated, service_role;
grant insert, update, delete on table public.content_categories to authenticated;

alter table public.ads
  add column if not exists category_id uuid references public.content_categories (id) on delete set null;

alter table public.notices
  add column if not exists category_id uuid references public.content_categories (id) on delete set null;

create index if not exists ads_category_id_idx on public.ads (category_id);
create index if not exists notices_category_id_idx on public.notices (category_id);

create or replace function public.content_category_kind_matches()
returns trigger
language plpgsql
as $$
declare
  v_kind text;
  v_expected text;
begin
  if new.category_id is null then
    return new;
  end if;

  if tg_table_name = 'ads' then
    v_expected := 'offer';
  elsif tg_table_name = 'notices' then
    v_expected := 'notice';
  else
    raise exception 'Unsupported table for content category';
  end if;

  select c.kind into v_kind
  from public.content_categories c
  where c.id = new.category_id
    and c.is_deleted = false;

  if v_kind is null then
    raise exception 'Category not found';
  end if;
  if v_kind is distinct from v_expected then
    raise exception 'Pick a % category', v_expected;
  end if;

  return new;
end;
$$;

create trigger ads_category_kind
  before insert or update of category_id on public.ads
  for each row execute function public.content_category_kind_matches();

create trigger notices_category_kind
  before insert or update of category_id on public.notices
  for each row execute function public.content_category_kind_matches();

insert into public.content_categories (kind, slug, name, emoji, sort_order) values
  ('offer', 'clothing', 'Clothing', '👕', 1),
  ('offer', 'utensils', 'Utensils', '🍴', 2),
  ('offer', 'grocery', 'Grocery', '🛒', 3),
  ('offer', 'electronics', 'Electronics', '📱', 4),
  ('offer', 'food', 'Food', '🍱', 5),
  ('notice', 'events', 'Events', '🎉', 1),
  ('notice', 'functions', 'Functions', '🪔', 2),
  ('notice', 'alerts', 'Alerts', '📢', 3),
  ('notice', 'community', 'Community', '🤝', 4);

comment on table public.content_categories is 'Categories for Offerly offers and Notify notices. kind = offer | notice.';
comment on column public.ads.category_id is 'Offer category from content_categories (kind = offer).';
comment on column public.notices.category_id is 'Notice category from content_categories (kind = notice).';
