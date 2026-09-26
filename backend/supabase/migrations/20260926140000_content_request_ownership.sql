begin;

alter table public.ads add column request_id uuid references public.content_requests(id) on delete set null;
alter table public.notices add column request_id uuid references public.content_requests(id) on delete set null;
create index ads_request_idx on public.ads(request_id) where request_id is not null;
create index notices_request_idx on public.notices(request_id) where request_id is not null;

-- Do not silently discard ambiguous links from the earlier model.
do $$ begin
  if exists(select ad_id from public.content_requests where ad_id is not null group by ad_id having count(*) > 1)
    or exists(select notice_id from public.content_requests where notice_id is not null group by notice_id having count(*) > 1) then
    raise exception 'Multiple requests link to the same content. Resolve duplicate links before migrating.';
  end if;
end $$;
update public.ads a set request_id = r.id from public.content_requests r where r.ad_id = a.id;
update public.notices n set request_id = r.id from public.content_requests r where r.notice_id = n.id;
alter table public.content_requests drop column ad_id, drop column notice_id;

create function public.validate_content_request_kind() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.request_id is not null and not exists (
    select 1 from public.content_requests where id = new.request_id
      and kind = case when tg_table_name = 'ads' then 'offer' else 'notice' end
  ) then
    raise exception 'Select a request matching this content type.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger ads_request_kind before insert or update of request_id on public.ads
  for each row execute function public.validate_content_request_kind();
create trigger notices_request_kind before insert or update of request_id on public.notices
  for each row execute function public.validate_content_request_kind();

create function public.protect_linked_request_kind() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.kind is distinct from old.kind and (
    exists(select 1 from public.ads where request_id = old.id) or
    exists(select 1 from public.notices where request_id = old.id)
  ) then
    raise exception 'Unlink content before changing request type.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger content_requests_linked_kind before update of kind on public.content_requests
  for each row execute function public.protect_linked_request_kind();

notify pgrst, 'reload schema';
commit;
