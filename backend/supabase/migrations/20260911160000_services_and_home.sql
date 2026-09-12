begin;
-- Area services (events / local announcements). Same geo rules as ads.
-- Empty coverage = everywhere. No click tracking.

create table public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_active_deleted_chk check (not (is_deleted and is_active))
);

create index services_visible_sort_idx
  on public.services (sort_order)
  where is_active = true and is_deleted = false;

create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

alter table public.services enable row level security;

create policy "services_read_active"
  on public.services
  for select
  to authenticated, anon
  using (
    is_active = true
    and is_deleted = false
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy "services_admin_select"
  on public.services
  for select
  to authenticated
  using (public.is_admin());

create policy "services_admin_insert"
  on public.services
  for insert
  to authenticated
  with check (public.is_admin());

create policy "services_admin_update"
  on public.services
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "services_admin_delete"
  on public.services
  for delete
  to authenticated
  using (public.is_admin());

grant select on table public.services to anon, authenticated, service_role;
grant insert, update, delete on table public.services to authenticated;

create table public.service_coverage (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  pincode text not null,
  locality_id uuid references public.localities (id) on delete cascade,
  area_id uuid references public.areas (id) on delete cascade,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ssa_pincode_chk check (pincode ~ '^[1-9][0-9]{5}$'),
  constraint ssa_hierarchy_chk check (area_id is null or locality_id is not null),
  constraint ssa_active_deleted_chk check (not (is_deleted and is_active))
);

create unique index ssa_unique_idx
  on public.service_coverage (
    service_id,
    pincode,
    (coalesce(locality_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    (coalesce(area_id, '00000000-0000-0000-0000-000000000000'::uuid))
  )
  where is_deleted = false;

create index ssa_service_idx
  on public.service_coverage (service_id)
  where is_active = true and is_deleted = false;

create index ssa_pincode_idx
  on public.service_coverage (pincode)
  where is_active = true and is_deleted = false;

create trigger ssa_updated_at before update on public.service_coverage
  for each row execute function public.set_updated_at();

create or replace function public.ssa_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.locality_id is not null and not exists (
    select 1 from public.localities l
    where l.id = new.locality_id
      and l.pincode = new.pincode
      and l.is_deleted = false
  ) then
    raise exception 'Locality does not belong to this pincode';
  end if;

  if new.area_id is not null and not exists (
    select 1 from public.areas a
    where a.id = new.area_id
      and a.locality_id = new.locality_id
      and a.is_deleted = false
  ) then
    raise exception 'Area does not belong to this locality';
  end if;

  if new.locality_id is null and new.area_id is null then
    if exists (
      select 1 from public.service_coverage s
      where s.service_id = new.service_id
        and s.pincode = new.pincode
        and s.id is distinct from new.id
        and s.is_deleted = false
    ) then
      raise exception 'Remove locality/area coverage for this pincode before covering the whole pincode';
    end if;
  else
    if exists (
      select 1 from public.service_coverage s
      where s.service_id = new.service_id
        and s.pincode = new.pincode
        and s.locality_id is null
        and s.area_id is null
        and s.id is distinct from new.id
        and s.is_deleted = false
    ) then
      raise exception 'This pincode is already covered entirely. Remove whole-pincode coverage first';
    end if;
  end if;

  return new;
end;
$$;

create trigger ssa_validate
  before insert or update on public.service_coverage
  for each row execute function public.ssa_validate();

create or replace function public.services_covering(
  p_pincode text default null,
  p_locality_id uuid default null,
  p_area_id uuid default null
)
returns table (service_id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  select n.id
  from public.services n
  where n.is_active = true
    and n.is_deleted = false
    and (n.starts_at is null or n.starts_at <= now())
    and (n.ends_at is null or n.ends_at > now())
    and (
      p_pincode is null
      or not exists (
        select 1
        from public.service_coverage s
        where s.service_id = n.id
          and s.is_active = true
          and s.is_deleted = false
      )
      or exists (
        select 1
        from public.service_coverage s
        where s.service_id = n.id
          and s.is_active = true
          and s.is_deleted = false
          and s.pincode = p_pincode
          and (
            p_locality_id is null
            or (s.locality_id is null and s.area_id is null)
            or (
              p_locality_id is not null
              and s.locality_id = p_locality_id
              and (p_area_id is null or s.area_id is null)
            )
            or (
              p_area_id is not null
              and s.locality_id = p_locality_id
              and s.area_id = p_area_id
            )
          )
      )
    );
$$;

create or replace function public.replace_service_pincode_coverage(
  p_service_id uuid,
  p_pincode text,
  p_mode text,
  p_items jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_locality_id uuid;
  v_area_id text;
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  if p_mode not in ('whole', 'precise') then
    raise exception 'Coverage mode must be whole or precise';
  end if;
  if p_pincode is null or p_pincode !~ '^[1-9][0-9]{5}$' then
    raise exception 'Enter a valid 6-digit pincode';
  end if;
  if not exists (select 1 from public.services where id = p_service_id) then
    raise exception 'Service not found';
  end if;

  delete from public.service_coverage
  where service_id = p_service_id
    and pincode = p_pincode;

  if p_mode = 'whole' then
    insert into public.service_coverage (service_id, pincode)
    values (p_service_id, p_pincode);
    return;
  end if;

  for v_item in select jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_locality_id := public.upsert_locality(p_pincode, v_item->>'locality_name');
    if coalesce((v_item->>'entire_locality')::boolean, false)
       or jsonb_array_length(coalesce(v_item->'area_ids', '[]'::jsonb)) = 0 then
      insert into public.service_coverage (service_id, pincode, locality_id)
      values (p_service_id, p_pincode, v_locality_id);
    else
      for v_area_id in
        select jsonb_array_elements_text(coalesce(v_item->'area_ids', '[]'::jsonb))
      loop
        insert into public.service_coverage (service_id, pincode, locality_id, area_id)
        values (p_service_id, p_pincode, v_locality_id, v_area_id::uuid);
      end loop;
    end if;
  end loop;
end;
$$;

revoke all on function public.services_covering(text, uuid, uuid) from public;
grant execute on function public.services_covering(text, uuid, uuid) to authenticated, anon;
revoke all on function public.replace_service_pincode_coverage(uuid, text, text, jsonb) from public, anon;
grant execute on function public.replace_service_pincode_coverage(uuid, text, text, jsonb) to authenticated;

alter table public.service_coverage enable row level security;

create policy "ssa_read"
  on public.service_coverage
  for select
  to authenticated, anon
  using (is_active = true and is_deleted = false);

create policy "ssa_admin_select"
  on public.service_coverage
  for select
  to authenticated
  using (public.is_admin());

create policy "ssa_admin_insert"
  on public.service_coverage
  for insert
  to authenticated
  with check (public.is_admin());

create policy "ssa_admin_update"
  on public.service_coverage
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "ssa_admin_delete"
  on public.service_coverage
  for delete
  to authenticated
  using (public.is_admin());

grant select on table public.service_coverage to anon, authenticated, service_role;
grant insert, update, delete on table public.service_coverage to authenticated;

comment on table public.services is 'Area events and announcements shown in the in-app Notifications menu. Empty coverage shows everywhere.';
comment on function public.services_covering(text, uuid, uuid) is 'Active services visible at a customer location. Untargeted services (no rows) show everywhere.';

alter table public.services
 add column cta_label text,
 add column cta_url text,
 add column event_starts_at timestamptz,
 add column event_ends_at timestamptz,
 add column category_id uuid references public.content_categories(id) on delete set null;
create index services_category_id_idx on public.services(category_id);
alter table public.content_categories drop constraint content_categories_kind_chk;
alter table public.content_categories add constraint content_categories_kind_chk check (kind in ('offer','notice','service'));
alter table public.ads add column is_home_screen boolean not null default true;
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
  elsif tg_table_name = 'services' then
    v_expected := 'service';
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


create trigger services_category_kind before insert or update of category_id on public.services
 for each row execute function public.content_category_kind_matches();
insert into public.content_categories (kind,slug,name,emoji,sort_order) values
 ('service','plumbing','Plumbing','🔧',1),
 ('service','electrician','Electrician','⚡',2),
 ('service','carpentry','Carpentry','🪚',3),
 ('service','cleaning','Cleaning','🧹',4),
 ('service','appliance_repair','Appliance repair','🛠️',5);
comment on table public.services is 'Admin-published local service listings. Contact details belong in the description and action link; dates describe availability.';


-- Pincode-only detection includes precise coverage inside that pincode.
create or replace function public.ads_covering(
  p_pincode text default null,
  p_locality_id uuid default null,
  p_area_id uuid default null
)
returns table (ad_id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  select a.id
  from public.ads a
  where a.is_active = true
    and a.is_deleted = false
    and (a.starts_at is null or a.starts_at <= now())
    and (a.ends_at is null or a.ends_at > now())
    and (
      p_pincode is null
      or not exists (
        select 1
        from public.ad_service_areas s
        where s.ad_id = a.id
          and s.is_active = true
          and s.is_deleted = false
      )
      or exists (
        select 1
        from public.ad_service_areas s
        where s.ad_id = a.id
          and s.is_active = true
          and s.is_deleted = false
          and s.pincode = p_pincode
          and (
            p_locality_id is null
            or (s.locality_id is null and s.area_id is null)
            or (
              p_locality_id is not null
              and s.locality_id = p_locality_id
              and (p_area_id is null or s.area_id is null)
            )
            or (
              p_area_id is not null
              and s.locality_id = p_locality_id
              and s.area_id = p_area_id
            )
          )
      )
    );
$$;
create or replace function public.notices_covering(
  p_pincode text default null,
  p_locality_id uuid default null,
  p_area_id uuid default null
)
returns table (notice_id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  select n.id
  from public.notices n
  where n.is_active = true
    and n.is_deleted = false
    and (n.starts_at is null or n.starts_at <= now())
    and (n.ends_at is null or n.ends_at > now())
    and (
      p_pincode is null
      or not exists (
        select 1
        from public.notice_service_areas s
        where s.notice_id = n.id
          and s.is_active = true
          and s.is_deleted = false
      )
      or exists (
        select 1
        from public.notice_service_areas s
        where s.notice_id = n.id
          and s.is_active = true
          and s.is_deleted = false
          and s.pincode = p_pincode
          and (
            p_locality_id is null
            or (s.locality_id is null and s.area_id is null)
            or (
              p_locality_id is not null
              and s.locality_id = p_locality_id
              and (p_area_id is null or s.area_id is null)
            )
            or (
              p_area_id is not null
              and s.locality_id = p_locality_id
              and s.area_id = p_area_id
            )
          )
      )
    );
$$;

commit;
