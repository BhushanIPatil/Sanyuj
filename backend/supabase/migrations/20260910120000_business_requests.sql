-- Public apps are directories; only administrators manage published businesses.
begin;
alter table public.businesses
  add column contact_name text,
  add column phone text,
  add column email text,
  add column address text,
  add column pincode text,
  add column locality text,
  add column area text,
  add column locality_id uuid references public.localities(id) on delete set null,
  add column area_id uuid references public.areas(id) on delete set null,
  add column lat double precision,
  add column lng double precision;
update public.businesses b set contact_name=p.full_name, phone=p.phone, email=p.email,
  address=p.address, pincode=p.pincode, locality=p.locality, area=p.area,
  locality_id=p.locality_id, area_id=p.area_id, lat=p.lat, lng=p.lng
from public.profiles p where p.id=b.owner_id;
alter table public.businesses alter column owner_id drop not null;
alter table public.businesses drop constraint businesses_owner_id_fkey;
alter table public.businesses add constraint businesses_owner_id_fkey
  foreign key(owner_id) references public.profiles(id) on delete set null;
update public.businesses set owner_id=null;
drop trigger if exists on_auth_user_created on auth.users;
-- Retire existing non-admin logins without deleting historical records.
update auth.users set banned_until='9999-12-31 23:59:59+00'::timestamptz
where not exists(select 1 from public.admins a where a.id=auth.users.id);
-- Already-issued access tokens also lose every owner write policy below.

-- Retain historical profiles privately for migration/audit; never expose them publicly.
do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies
    where (schemaname='public' and tablename in ('profiles','businesses','live_sessions','business_service_areas','device_tokens')
      and (tablename in ('profiles','device_tokens') or cmd <> 'SELECT'))
      or (schemaname='storage' and policyname like 'business_photos_owner_%')
  loop execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop;
end $$;
create policy device_tokens_admin_read on public.device_tokens for select to authenticated using(public.is_admin());
create policy profiles_archive_admin on public.profiles for select to authenticated using(public.is_admin());
create policy businesses_admin_write on public.businesses for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy live_admin_write on public.live_sessions for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy coverage_admin_write on public.business_service_areas for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy business_photos_admin_write on storage.objects for all to authenticated
  using(bucket_id='business-photos' and public.is_admin()) with check(bucket_id='business-photos' and public.is_admin());
revoke execute on function public.delete_own_business() from public, anon, authenticated;
revoke execute on function public.create_other_category(text) from public, anon, authenticated;
revoke execute on function public.replace_pincode_coverage(uuid,text,text,jsonb) from public, anon, authenticated;

create or replace function public.businesses_default_coverage() returns trigger language plpgsql
security definer set search_path=public as $$ begin
  if new.pincode ~ '^[1-9][0-9]{5}$' then
    insert into public.business_service_areas(business_id,pincode) values(new.id,new.pincode);
  end if;
  return new;
end $$;

create table public.business_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('new','update')),
  business_id uuid references public.businesses(id) on delete restrict,
  contact_name text not null check(length(trim(contact_name)) between 2 and 120),
  phone text not null check(phone ~ '^\+?[0-9]{10,15}$'),
  email text check(length(email)<=254),
  business_name text not null check(length(trim(business_name)) between 2 and 160),
  details text not null check(length(trim(details)) between 10 and 5000),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  review_note text,
  reviewed_by uuid references public.admins(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check(kind='new' or business_id is not null)
);
create index business_requests_queue_idx on public.business_requests(status,created_at desc);
alter table public.business_requests enable row level security;
create policy requests_admin_read on public.business_requests for select to authenticated using(public.is_admin());
grant select on public.business_requests to authenticated;
grant all on public.business_requests to service_role;
-- No public insert/select policy. Submission goes through the rate-limited backend.


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
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_mode not in ('whole', 'precise') then
    raise exception 'Coverage mode must be whole or precise';
  end if;
  if p_pincode is null or p_pincode !~ '^[1-9][0-9]{5}$' then
    raise exception 'Enter a valid 6-digit pincode';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.is_deleted = false
  ) then
    raise exception 'Business unavailable';
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

grant execute on function public.replace_pincode_coverage(uuid,text,text,jsonb) to authenticated;
create function public.replace_business_coverage(p_business_id uuid,p_pins jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare pin jsonb; begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  perform 1 from public.businesses where id=p_business_id and not is_deleted for update;
  if not found then raise exception 'Business unavailable'; end if;
  if p_pins is null or jsonb_typeof(p_pins)<>'array' or jsonb_array_length(p_pins)>100 then raise exception 'Invalid coverage'; end if;
  delete from public.business_service_areas where business_id=p_business_id;
  for pin in select * from jsonb_array_elements(p_pins) loop
    perform public.replace_pincode_coverage(p_business_id,pin->>'pincode',case when (pin->>'whole')::boolean then 'whole' else 'precise' end,
      coalesce((select jsonb_agg(jsonb_build_object('locality_name',i->>'localityName','entire_locality',i->'entireLocality','area_ids',i->'areaIds')) from jsonb_array_elements(pin->'items') i),'[]'::jsonb));
  end loop;
end $$;
revoke all on function public.replace_business_coverage(uuid,jsonb) from public,anon;
grant execute on function public.replace_business_coverage(uuid,jsonb) to authenticated;

-- Atomic publication and review. The row lock prevents duplicate approvals.
create function public.review_business_request(p_request_id uuid, p_action text, p_note text, p_business jsonb default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.business_requests; bid uuid; cid uuid; begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_action not in ('approved','rejected') or p_action is null then raise exception 'Invalid action'; end if;
  if length(trim(coalesce(p_note,''))) not between 5 and 5000 then raise exception 'Record verification or rejection details'; end if;
  select * into r from public.business_requests where id=p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if r.status<>'pending' then raise exception 'Request already reviewed'; end if;
  bid:=r.business_id;
  if p_action='approved' then
    if p_business is null then raise exception 'Reviewed business details required'; end if;
    if length(trim(coalesce(p_business->>'name',''))) not between 2 and 160 then raise exception 'Business name required'; end if;
    if coalesce(p_business->>'phone','') !~ '^\+?[0-9]{10,15}$' then raise exception 'Valid business phone required'; end if;
    if coalesce(p_business->>'pincode','') !~ '^[1-9][0-9]{5}$' then raise exception 'Valid pincode required'; end if;
    if length(trim(coalesce(p_business->>'contact_name',''))) not between 2 and 120 then raise exception 'Contact name required'; end if;
    if length(coalesce(p_business->>'address','')) > 1000 or length(coalesce(p_business->>'email','')) > 254 then raise exception 'Business details too long'; end if;
    cid:=(p_business->>'category_id')::uuid;
    if not exists(select 1 from public.categories where id=cid and is_active and not is_deleted) then raise exception 'Select an active category'; end if;
    if r.kind='new' then
      insert into public.businesses(name,category_id,contact_name,phone,email,address,pincode)
      values(trim(p_business->>'name'),cid,trim(p_business->>'contact_name'),p_business->>'phone',nullif(p_business->>'email',''),p_business->>'address',p_business->>'pincode') returning id into bid;
    else
      perform 1 from public.businesses where id=bid and not is_deleted for update;
      if not found then raise exception 'Business unavailable'; end if;
      update public.businesses set name=trim(p_business->>'name'),category_id=cid,
        contact_name=trim(p_business->>'contact_name'),phone=p_business->>'phone',email=nullif(p_business->>'email',''),
        lat=case when address is distinct from (p_business->>'address') or pincode is distinct from (p_business->>'pincode') then null else lat end,
        lng=case when address is distinct from (p_business->>'address') or pincode is distinct from (p_business->>'pincode') then null else lng end,
        locality=case when pincode is distinct from (p_business->>'pincode') then null else locality end,
        locality_id=case when pincode is distinct from (p_business->>'pincode') then null else locality_id end,
        area=case when pincode is distinct from (p_business->>'pincode') then null else area end,
        area_id=case when pincode is distinct from (p_business->>'pincode') then null else area_id end,
        address=p_business->>'address',pincode=p_business->>'pincode' where id=bid;
    end if;
  end if;
  if p_action='approved' and p_business ? 'coverage' then
    perform public.replace_business_coverage(bid,p_business->'coverage');
  end if;
  if p_action='approved' and p_business ? 'photo_url' then
    update public.businesses set photo_url=nullif(p_business->>'photo_url','') where id=bid;
  end if;
  update public.business_requests set status=p_action,business_id=bid,review_note=trim(p_note),reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
  return bid;
end $$;
revoke all on function public.review_business_request(uuid,text,text,jsonb) from public,anon;
grant execute on function public.review_business_request(uuid,text,text,jsonb) to authenticated;
-- Anonymous installations can receive broadcast push notifications through the backend.
alter table public.device_tokens alter column user_id drop not null;
update public.device_tokens set user_id=null;
commit;
