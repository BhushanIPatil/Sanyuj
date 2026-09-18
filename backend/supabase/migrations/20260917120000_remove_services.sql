begin;

-- Remove the retired listing feature while keeping Home and notice/offer coverage.
drop function public.services_covering(text, uuid, uuid);
drop function public.replace_service_pincode_coverage(uuid, text, text, jsonb);
drop table public.service_coverage;
drop function public.ssa_validate();
drop table public.services;

delete from public.content_categories where kind = 'service';
alter table public.content_categories drop constraint content_categories_kind_chk;
alter table public.content_categories add constraint content_categories_kind_chk
  check (kind in ('offer', 'notice'));

-- Remove request images through the Storage API before applying this migration;
-- deleting storage.objects directly would leave files orphaned in object storage.
delete from public.content_requests where kind = 'service';
alter table public.content_requests drop constraint content_requests_kind_check;
alter table public.content_requests add constraint content_requests_kind_check
  check (kind in ('offer', 'notice'));

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
  select c.kind into v_kind from public.content_categories c
  where c.id = new.category_id and c.is_deleted = false;
  if v_kind is null then
    raise exception 'Category not found';
  end if;
  if v_kind is distinct from v_expected then
    raise exception 'Pick a % category', v_expected;
  end if;
  return new;
end;
$$;

commit;
