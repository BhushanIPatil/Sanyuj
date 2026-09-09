-- Area notices (events / local announcements). Same geo rules as ads.
-- Empty coverage = everywhere. No click tracking.

create table public.notices (
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
  constraint notices_active_deleted_chk check (not (is_deleted and is_active))
);

create index notices_visible_sort_idx
  on public.notices (sort_order)
  where is_active = true and is_deleted = false;

create trigger notices_updated_at before update on public.notices
  for each row execute function public.set_updated_at();

alter table public.notices enable row level security;

create policy "notices_read_active"
  on public.notices
  for select
  to authenticated, anon
  using (
    is_active = true
    and is_deleted = false
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy "notices_admin_select"
  on public.notices
  for select
  to authenticated
  using (public.is_admin());

create policy "notices_admin_insert"
  on public.notices
  for insert
  to authenticated
  with check (public.is_admin());

create policy "notices_admin_update"
  on public.notices
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "notices_admin_delete"
  on public.notices
  for delete
  to authenticated
  using (public.is_admin());

grant select on table public.notices to anon, authenticated, service_role;
grant insert, update, delete on table public.notices to authenticated;

create table public.notice_service_areas (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices (id) on delete cascade,
  pincode text not null,
  locality_id uuid references public.localities (id) on delete cascade,
  area_id uuid references public.areas (id) on delete cascade,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nsa_pincode_chk check (pincode ~ '^[1-9][0-9]{5}$'),
  constraint nsa_hierarchy_chk check (area_id is null or locality_id is not null),
  constraint nsa_active_deleted_chk check (not (is_deleted and is_active))
);

create unique index nsa_unique_idx
  on public.notice_service_areas (
    notice_id,
    pincode,
    (coalesce(locality_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    (coalesce(area_id, '00000000-0000-0000-0000-000000000000'::uuid))
  )
  where is_deleted = false;

create index nsa_notice_idx
  on public.notice_service_areas (notice_id)
  where is_active = true and is_deleted = false;

create index nsa_pincode_idx
  on public.notice_service_areas (pincode)
  where is_active = true and is_deleted = false;

create trigger nsa_updated_at before update on public.notice_service_areas
  for each row execute function public.set_updated_at();

create or replace function public.nsa_validate()
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
      select 1 from public.notice_service_areas s
      where s.notice_id = new.notice_id
        and s.pincode = new.pincode
        and s.id is distinct from new.id
        and s.is_deleted = false
    ) then
      raise exception 'Remove locality/area coverage for this pincode before covering the whole pincode';
    end if;
  else
    if exists (
      select 1 from public.notice_service_areas s
      where s.notice_id = new.notice_id
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

create trigger nsa_validate
  before insert or update on public.notice_service_areas
  for each row execute function public.nsa_validate();

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
            (s.locality_id is null and s.area_id is null)
            or (
              p_locality_id is not null
              and s.locality_id = p_locality_id
              and s.area_id is null
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

create or replace function public.replace_notice_pincode_coverage(
  p_notice_id uuid,
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
  if not exists (select 1 from public.notices where id = p_notice_id) then
    raise exception 'Notice not found';
  end if;

  delete from public.notice_service_areas
  where notice_id = p_notice_id
    and pincode = p_pincode;

  if p_mode = 'whole' then
    insert into public.notice_service_areas (notice_id, pincode)
    values (p_notice_id, p_pincode);
    return;
  end if;

  for v_item in select jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_locality_id := public.upsert_locality(p_pincode, v_item->>'locality_name');
    if coalesce((v_item->>'entire_locality')::boolean, false)
       or jsonb_array_length(coalesce(v_item->'area_ids', '[]'::jsonb)) = 0 then
      insert into public.notice_service_areas (notice_id, pincode, locality_id)
      values (p_notice_id, p_pincode, v_locality_id);
    else
      for v_area_id in
        select jsonb_array_elements_text(coalesce(v_item->'area_ids', '[]'::jsonb))
      loop
        insert into public.notice_service_areas (notice_id, pincode, locality_id, area_id)
        values (p_notice_id, p_pincode, v_locality_id, v_area_id::uuid);
      end loop;
    end if;
  end loop;
end;
$$;

revoke all on function public.notices_covering(text, uuid, uuid) from public;
grant execute on function public.notices_covering(text, uuid, uuid) to authenticated, anon;
revoke all on function public.replace_notice_pincode_coverage(uuid, text, text, jsonb) from public, anon;
grant execute on function public.replace_notice_pincode_coverage(uuid, text, text, jsonb) to authenticated;

alter table public.notice_service_areas enable row level security;

create policy "nsa_read"
  on public.notice_service_areas
  for select
  to authenticated, anon
  using (is_active = true and is_deleted = false);

create policy "nsa_admin_select"
  on public.notice_service_areas
  for select
  to authenticated
  using (public.is_admin());

create policy "nsa_admin_insert"
  on public.notice_service_areas
  for insert
  to authenticated
  with check (public.is_admin());

create policy "nsa_admin_update"
  on public.notice_service_areas
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "nsa_admin_delete"
  on public.notice_service_areas
  for delete
  to authenticated
  using (public.is_admin());

grant select on table public.notice_service_areas to anon, authenticated, service_role;
grant insert, update, delete on table public.notice_service_areas to authenticated;

comment on table public.notices is 'Area events and announcements shown in the in-app Notifications menu. Empty coverage shows everywhere.';
comment on function public.notices_covering(text, uuid, uuid) is 'Active notices visible at a customer location. Untargeted notices (no rows) show everywhere.';
