-- Precise location: pincode → locality → area
-- Localities are cached when a user saves them on their profile (not on API fetch).
-- Areas are admin-curated colonies / landmarks / societies.
-- Business coverage is independent of the owner profile.

-- ---------- localities ----------
create table public.localities (
  id uuid primary key default gen_random_uuid(),
  pincode text not null,
  name text not null,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint localities_pincode_chk check (pincode ~ '^[1-9][0-9]{5}$'),
  constraint localities_name_chk check (length(trim(name)) > 0),
  constraint localities_active_deleted_chk check (not (is_deleted and is_active))
);

create unique index localities_pincode_name_uidx
  on public.localities (pincode, (lower(name)));

create index localities_pincode_idx
  on public.localities (pincode)
  where is_active = true and is_deleted = false;

create trigger localities_updated_at before update on public.localities
  for each row execute function public.set_updated_at();

-- ---------- areas ----------
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  locality_id uuid not null references public.localities (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint areas_name_chk check (length(trim(name)) > 0),
  constraint areas_active_deleted_chk check (not (is_deleted and is_active))
);

create unique index areas_locality_name_uidx
  on public.areas (locality_id, (lower(name)));

create index areas_locality_idx
  on public.areas (locality_id)
  where is_active = true and is_deleted = false;

create trigger areas_updated_at before update on public.areas
  for each row execute function public.set_updated_at();

-- ---------- profile / job location ids ----------
alter table public.profiles
  add column if not exists locality_id uuid references public.localities (id) on delete set null,
  add column if not exists area text,
  add column if not exists area_id uuid references public.areas (id) on delete set null;

alter table public.jobs
  add column if not exists locality_id uuid references public.localities (id) on delete set null,
  add column if not exists area text,
  add column if not exists area_id uuid references public.areas (id) on delete set null;

create index if not exists profiles_locality_id_idx on public.profiles (locality_id);
create index if not exists profiles_area_id_idx on public.profiles (area_id);
create index if not exists jobs_locality_id_idx on public.jobs (locality_id);
create index if not exists jobs_area_id_idx on public.jobs (area_id);

-- ---------- business service areas ----------
create table public.business_service_areas (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  pincode text not null,
  locality_id uuid references public.localities (id) on delete cascade,
  area_id uuid references public.areas (id) on delete cascade,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bsa_pincode_chk check (pincode ~ '^[1-9][0-9]{5}$'),
  constraint bsa_hierarchy_chk check (area_id is null or locality_id is not null),
  constraint bsa_active_deleted_chk check (not (is_deleted and is_active))
);

create unique index bsa_unique_idx
  on public.business_service_areas (
    business_id,
    pincode,
    (coalesce(locality_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    (coalesce(area_id, '00000000-0000-0000-0000-000000000000'::uuid))
  )
  where is_deleted = false;

create index bsa_business_idx
  on public.business_service_areas (business_id)
  where is_active = true and is_deleted = false;

create index bsa_pincode_idx
  on public.business_service_areas (pincode)
  where is_active = true and is_deleted = false;

create trigger bsa_updated_at before update on public.business_service_areas
  for each row execute function public.set_updated_at();

-- ---------- upsert_locality (authenticated; used by profile trigger + coverage save) ----------
create or replace function public.upsert_locality(p_pincode text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_pincode is null or p_pincode !~ '^[1-9][0-9]{5}$' then
    raise exception 'Enter a valid 6-digit pincode';
  end if;
  v_name := trim(p_name);
  if v_name is null or v_name = '' then
    raise exception 'Locality name is required';
  end if;

  begin
    insert into public.localities (pincode, name)
    values (p_pincode, v_name)
    returning id into v_id;
    return v_id;
  exception
    when unique_violation then
      update public.localities
      set
        name = v_name,
        is_active = true,
        is_deleted = false,
        updated_at = now()
      where pincode = p_pincode
        and lower(name) = lower(v_name)
      returning id into v_id;
      return v_id;
  end;
end;
$$;

revoke all on function public.upsert_locality(text, text) from public, anon;
grant execute on function public.upsert_locality(text, text) to authenticated;

-- ---------- profile save caches locality ----------
create or replace function public.profiles_sync_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pincode is not null
     and new.locality is not null
     and length(trim(new.locality)) > 0 then
    if auth.uid() is not null then
      new.locality_id := public.upsert_locality(new.pincode, new.locality);
    elsif new.locality_id is null then
      select id into new.locality_id
      from public.localities
      where pincode = new.pincode
        and lower(name) = lower(trim(new.locality))
        and is_deleted = false
      limit 1;
    end if;
  else
    new.locality_id := null;
  end if;

  if new.area_id is not null then
    if new.locality_id is null or not exists (
      select 1 from public.areas a
      where a.id = new.area_id
        and a.locality_id = new.locality_id
        and a.is_active = true
        and a.is_deleted = false
    ) then
      new.area_id := null;
      new.area := null;
    else
      select name into new.area from public.areas where id = new.area_id;
    end if;
  elsif new.area is not null and length(trim(new.area)) > 0 and new.locality_id is not null then
    select id into new.area_id
    from public.areas
    where locality_id = new.locality_id
      and lower(name) = lower(trim(new.area))
      and is_active = true
      and is_deleted = false
    limit 1;
    if new.area_id is null then
      new.area := null;
    else
      select name into new.area from public.areas where id = new.area_id;
    end if;
  else
    new.area_id := null;
    new.area := null;
  end if;

  return new;
end;
$$;

create trigger profiles_sync_location
  before insert or update of pincode, locality, locality_id, area, area_id
  on public.profiles
  for each row execute function public.profiles_sync_location();

-- Jobs resolve IDs from existing rows only (do not cache new localities).
create or replace function public.jobs_sync_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.locality_id is null
     and new.pincode is not null
     and new.locality is not null
     and length(trim(new.locality)) > 0 then
    select id into new.locality_id
    from public.localities
    where pincode = new.pincode
      and lower(name) = lower(trim(new.locality))
      and is_deleted = false
    limit 1;
  end if;

  if new.area_id is not null then
    if new.locality_id is null or not exists (
      select 1 from public.areas a
      where a.id = new.area_id
        and a.locality_id = new.locality_id
        and a.is_active = true
        and a.is_deleted = false
    ) then
      new.area_id := null;
      new.area := null;
    else
      select name into new.area from public.areas where id = new.area_id;
    end if;
  elsif new.area is not null and length(trim(new.area)) > 0 and new.locality_id is not null then
    select id into new.area_id
    from public.areas
    where locality_id = new.locality_id
      and lower(name) = lower(trim(new.area))
      and is_active = true
      and is_deleted = false
    limit 1;
    if new.area_id is null then
      new.area := null;
    else
      select name into new.area from public.areas where id = new.area_id;
    end if;
  else
    new.area_id := null;
    new.area := null;
  end if;

  return new;
end;
$$;

create trigger jobs_sync_location
  before insert or update of pincode, locality, locality_id, area, area_id
  on public.jobs
  for each row execute function public.jobs_sync_location();

-- ---------- coverage integrity ----------
create or replace function public.bsa_validate()
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
      select 1 from public.business_service_areas bsa
      where bsa.business_id = new.business_id
        and bsa.pincode = new.pincode
        and bsa.id is distinct from new.id
        and bsa.is_deleted = false
    ) then
      raise exception 'Remove locality/area coverage for this pincode before covering the whole pincode';
    end if;
  else
    if exists (
      select 1 from public.business_service_areas bsa
      where bsa.business_id = new.business_id
        and bsa.pincode = new.pincode
        and bsa.locality_id is null
        and bsa.area_id is null
        and bsa.id is distinct from new.id
        and bsa.is_deleted = false
    ) then
      raise exception 'This pincode is already covered entirely. Remove whole-pincode coverage first';
    end if;
  end if;

  return new;
end;
$$;

create trigger bsa_validate
  before insert or update on public.business_service_areas
  for each row execute function public.bsa_validate();

-- Default whole-pincode coverage from the owner profile.
create or replace function public.businesses_default_coverage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin text;
begin
  select pincode into v_pin from public.profiles where id = new.owner_id;
  if v_pin is not null and v_pin ~ '^[1-9][0-9]{5}$' then
    insert into public.business_service_areas (business_id, pincode)
    values (new.id, v_pin);
  end if;
  return new;
end;
$$;

create trigger businesses_default_coverage
  after insert on public.businesses
  for each row execute function public.businesses_default_coverage();

-- ---------- matching helpers ----------
create or replace function public.business_covers(
  p_business_id uuid,
  p_pincode text,
  p_locality_id uuid default null,
  p_area_id uuid default null
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.business_service_areas bsa
    where bsa.business_id = p_business_id
      and bsa.is_active = true
      and bsa.is_deleted = false
      and bsa.pincode = p_pincode
      and (
        (bsa.locality_id is null and bsa.area_id is null)
        or (
          p_locality_id is not null
          and bsa.locality_id = p_locality_id
          and bsa.area_id is null
        )
        or (
          p_area_id is not null
          and bsa.locality_id = p_locality_id
          and bsa.area_id = p_area_id
        )
      )
  );
$$;

create or replace function public.businesses_covering(
  p_pincode text,
  p_locality_id uuid default null,
  p_area_id uuid default null
)
returns table (business_id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct bsa.business_id
  from public.business_service_areas bsa
  join public.businesses b on b.id = bsa.business_id
  where bsa.is_active = true
    and bsa.is_deleted = false
    and b.is_active = true
    and b.is_deleted = false
    and bsa.pincode = p_pincode
    and (
      (bsa.locality_id is null and bsa.area_id is null)
      or (
        p_locality_id is not null
        and bsa.locality_id = p_locality_id
        and bsa.area_id is null
      )
      or (
        p_area_id is not null
        and bsa.locality_id = p_locality_id
        and bsa.area_id = p_area_id
      )
    );
$$;

create or replace function public.jobs_covered_by_business(p_business_id uuid)
returns table (job_id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  select j.id
  from public.jobs j
  where j.is_active = true
    and j.is_deleted = false
    and j.status = 'open'
    and public.business_covers(p_business_id, j.pincode, j.locality_id, j.area_id);
$$;

create or replace function public.business_covers_pincode(
  p_business_id uuid,
  p_pincode text
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.business_service_areas bsa
    where bsa.business_id = p_business_id
      and bsa.pincode = p_pincode
      and bsa.is_active = true
      and bsa.is_deleted = false
  );
$$;

grant execute on function public.business_covers(uuid, text, uuid, uuid) to authenticated, anon;
grant execute on function public.businesses_covering(text, uuid, uuid) to authenticated, anon;
grant execute on function public.jobs_covered_by_business(uuid) to authenticated;
grant execute on function public.business_covers_pincode(uuid, text) to authenticated;

-- Atomic coverage replace (owner only). Upserts API localities that are not cached yet.
create or replace function public.replace_pincode_coverage(
  p_business_id uuid,
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
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_mode not in ('whole', 'precise') then
    raise exception 'Coverage mode must be whole or precise';
  end if;
  if p_pincode is null or p_pincode !~ '^[1-9][0-9]{5}$' then
    raise exception 'Enter a valid 6-digit pincode';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.owner_id = auth.uid()
      and b.is_active = true
      and b.is_deleted = false
  ) then
    raise exception 'Not your business';
  end if;

  delete from public.business_service_areas
  where business_id = p_business_id
    and pincode = p_pincode;

  if p_mode = 'whole' then
    insert into public.business_service_areas (business_id, pincode)
    values (p_business_id, p_pincode);
    return;
  end if;

  for v_item in select jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_locality_id := public.upsert_locality(p_pincode, v_item->>'locality_name');
    if coalesce((v_item->>'entire_locality')::boolean, false)
       or jsonb_array_length(coalesce(v_item->'area_ids', '[]'::jsonb)) = 0 then
      insert into public.business_service_areas (business_id, pincode, locality_id)
      values (p_business_id, p_pincode, v_locality_id);
    else
      for v_area_id in
        select jsonb_array_elements_text(coalesce(v_item->'area_ids', '[]'::jsonb))
      loop
        insert into public.business_service_areas (business_id, pincode, locality_id, area_id)
        values (p_business_id, p_pincode, v_locality_id, v_area_id::uuid);
      end loop;
    end if;
  end loop;
end;
$$;

revoke all on function public.replace_pincode_coverage(uuid, text, text, jsonb) from public, anon;
grant execute on function public.replace_pincode_coverage(uuid, text, text, jsonb) to authenticated;

-- ---------- backfill ----------
insert into public.localities (pincode, name)
select s.pincode, s.name
from (
  select distinct on (pincode, lower(trim(locality)))
    pincode,
    trim(locality) as name
  from public.profiles
  where pincode ~ '^[1-9][0-9]{5}$'
    and locality is not null
    and length(trim(locality)) > 0
  order by pincode, lower(trim(locality))
) s
where not exists (
  select 1 from public.localities l
  where l.pincode = s.pincode and lower(l.name) = lower(s.name)
);

insert into public.localities (pincode, name)
select s.pincode, s.name
from (
  select distinct on (pincode, lower(trim(locality)))
    pincode,
    trim(locality) as name
  from public.jobs
  where pincode ~ '^[1-9][0-9]{5}$'
    and locality is not null
    and length(trim(locality)) > 0
  order by pincode, lower(trim(locality))
) s
where not exists (
  select 1 from public.localities l
  where l.pincode = s.pincode and lower(l.name) = lower(s.name)
);

-- Avoid upsert_locality (requires auth.uid) during backfill.
alter table public.profiles disable trigger profiles_sync_location;
update public.profiles p
set locality_id = l.id
from public.localities l
where p.locality_id is null
  and p.pincode = l.pincode
  and p.locality is not null
  and lower(trim(p.locality)) = lower(l.name)
  and l.is_deleted = false;
alter table public.profiles enable trigger profiles_sync_location;

alter table public.jobs disable trigger jobs_sync_location;
update public.jobs j
set locality_id = l.id
from public.localities l
where j.locality_id is null
  and j.pincode = l.pincode
  and j.locality is not null
  and lower(trim(j.locality)) = lower(l.name)
  and l.is_deleted = false;
alter table public.jobs enable trigger jobs_sync_location;

insert into public.business_service_areas (business_id, pincode)
select b.id, p.pincode
from public.businesses b
join public.profiles p on p.id = b.owner_id
where p.pincode ~ '^[1-9][0-9]{5}$'
  and not exists (
    select 1 from public.business_service_areas bsa
    where bsa.business_id = b.id and bsa.is_deleted = false
  );

-- ---------- RLS ----------
alter table public.localities enable row level security;
alter table public.areas enable row level security;
alter table public.business_service_areas enable row level security;

create policy "localities_read"
  on public.localities
  for select
  to authenticated, anon
  using (is_active = true and is_deleted = false);

create policy "localities_admin_select"
  on public.localities
  for select
  to authenticated
  using (public.is_admin());

create policy "areas_read"
  on public.areas
  for select
  to authenticated, anon
  using (is_active = true and is_deleted = false);

create policy "areas_admin_select"
  on public.areas
  for select
  to authenticated
  using (public.is_admin());

create policy "areas_admin_insert"
  on public.areas
  for insert
  to authenticated
  with check (public.is_admin());

create policy "areas_admin_update"
  on public.areas
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "areas_admin_delete"
  on public.areas
  for delete
  to authenticated
  using (public.is_admin());

create policy "bsa_read"
  on public.business_service_areas
  for select
  to authenticated, anon
  using (is_active = true and is_deleted = false);

create policy "bsa_admin_select"
  on public.business_service_areas
  for select
  to authenticated
  using (public.is_admin());

create policy "bsa_insert_own"
  on public.business_service_areas
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
    and is_active = true
    and is_deleted = false
  );

create policy "bsa_update_own"
  on public.business_service_areas
  for update
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

create policy "bsa_delete_own"
  on public.business_service_areas
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

grant select on table public.localities to anon, authenticated, service_role;
grant select, insert, update, delete on table public.areas to authenticated;
grant select on table public.areas to anon, service_role;
grant select, insert, update, delete on table public.business_service_areas to authenticated;
grant select on table public.business_service_areas to anon, service_role;

comment on table public.localities is 'Postal locality / village names cached when a user saves them on their profile.';
comment on table public.areas is 'Admin-curated colonies, landmarks, and societies under a locality.';
comment on table public.business_service_areas is 'Where a business serves: whole pincode, selected localities, or selected areas.';
