begin;
-- Supabase grants Storage access before its RLS policies run; model that in the fixture.
grant select on storage.objects to anon,authenticated;
set local role service_role;
insert into public.content_requests(id,kind,name,contact,image_path) values('60000000-0000-0000-0000-000000000001','offer','Test Person','9123456780','test-request.png');
reset role;
insert into storage.objects(bucket_id,name) values('request-images','test-request.png');
set local role anon;
do $$ begin
 begin perform * from public.content_requests; raise exception 'Public read allowed'; exception when insufficient_privilege then null;end;
 begin insert into public.content_requests(kind,name,contact,image_path) values('offer','Intruder','9999999999','injected.png'); raise exception 'Public insert allowed';exception when insufficient_privilege then null;end;
 if exists(select 1 from storage.objects where bucket_id='request-images') then raise exception 'Private image exposed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.content_requests) then raise exception 'Non-admin read allowed';end if;
 update public.content_requests set status='published';
 if found then raise exception 'Non-admin follow-up allowed';end if;
 if exists(select 1 from storage.objects where bucket_id='request-images') then raise exception 'Non-admin image exposed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.content_requests where contact='9123456780') then raise exception 'Admin cannot read requests';end if;
 if not exists(select 1 from storage.objects where bucket_id='request-images') then raise exception 'Admin cannot read images';end if;
 update public.content_requests set status='contacted',follow_up_notes='Call back tomorrow' where id='60000000-0000-0000-0000-000000000001';
 if not found then raise exception 'Admin cannot follow up';end if;
 begin update public.content_requests set status='invalid';raise exception 'Invalid status allowed';exception when check_violation then null;end;
end $$;
reset role;
do $$ begin
 if exists(select 1 from storage.buckets where id='request-images' and public) then raise exception 'Request bucket is public';end if;
end $$;
rollback;
