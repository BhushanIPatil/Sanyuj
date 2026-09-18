begin;
do $$ begin
  if to_regclass('public.services') is not null
     or to_regclass('public.service_coverage') is not null
     or to_regprocedure('public.services_covering(text,uuid,uuid)') is not null
     or to_regprocedure('public.replace_service_pincode_coverage(uuid,text,text,jsonb)') is not null
     or to_regprocedure('public.ssa_validate()') is not null then
    raise exception 'Retired service objects remain';
  end if;
  if exists(select 1 from public.content_categories where kind = 'service')
     or exists(select 1 from public.content_requests where kind = 'service') then
    raise exception 'Retired service data remains';
  end if;
  begin
    insert into public.content_categories(kind,slug,name) values('service','retired','Retired');
    raise exception 'Service category accepted';
  exception when check_violation then null; end;
  begin
    insert into public.content_requests(kind,name,contact,image_path)
    values('service','Test Person','9123456780','retired.png');
    raise exception 'Service request accepted';
  exception when check_violation then null; end;
  if not exists(select 1 from public.ads where id='40000000-0000-0000-0000-000000000001' and is_home_screen)
     or not exists(select 1 from public.notices_covering(null,null,null) where notice_id='40000000-0000-0000-0000-000000000002') then
    raise exception 'Home offers or notifications lost';
  end if;
  update public.ads set category_id=(select id from public.content_categories where kind='offer' limit 1)
  where id='40000000-0000-0000-0000-000000000001';
  begin
    update public.ads set category_id=(select id from public.content_categories where kind='notice' limit 1)
    where id='40000000-0000-0000-0000-000000000001';
    raise exception 'Wrong category accepted';
  exception when raise_exception then
    if sqlerrm <> 'Pick a offer category' then raise; end if;
  end;
end $$;
rollback;
