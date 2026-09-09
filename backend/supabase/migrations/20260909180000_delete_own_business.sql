-- Allow a user to list a new business after deleting the previous one,
-- and provide an owner-only RPC that soft-deletes the listing plus coverage/live.

alter table public.businesses drop constraint if exists businesses_owner_id_key;
drop index if exists businesses_owner_id_key;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'businesses'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ilike '%(owner_id)%'
  loop
    execute format('alter table public.businesses drop constraint if exists %I', r.conname);
  end loop;
end $$;

create unique index if not exists businesses_one_visible_per_owner
  on public.businesses (owner_id)
  where is_deleted = false;

create or replace function public.delete_own_business()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  bid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select id into bid
  from public.businesses
  where owner_id = auth.uid()
    and is_deleted = false
  limit 1;

  if bid is null then
    raise exception 'No business to delete';
  end if;

  update public.live_sessions
    set is_active = false,
        is_deleted = true,
        ends_at = now()
    where business_id = bid
      and is_deleted = false;

  update public.business_service_areas
    set is_active = false,
        is_deleted = true
    where business_id = bid
      and is_deleted = false;

  update public.businesses
    set is_active = false,
        is_deleted = true
    where id = bid;
end;
$$;

revoke all on function public.delete_own_business() from public;
grant execute on function public.delete_own_business() to authenticated;
