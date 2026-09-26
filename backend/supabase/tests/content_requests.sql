begin;
-- Supabase grants Storage access before its RLS policies run; model that in the fixture.
grant select,insert,delete on storage.objects to anon,authenticated;
set local role service_role;
insert into public.content_requests(id,kind,name,contact,image_path) values('60000000-0000-0000-0000-000000000001','offer','Test Person','9123456780','test-request.png');
reset role;
insert into storage.objects(bucket_id,name) values('request-images','test-request.png');
set local role anon;
do $$ begin
 begin perform * from public.content_requests; raise exception 'Public read allowed'; exception when insufficient_privilege then null;end;
 begin delete from public.content_requests;raise exception 'Public delete allowed';exception when insufficient_privilege then null;end;
 begin insert into public.content_requests(kind,name,contact,image_path) values('offer','Intruder','9999999999','injected.png'); raise exception 'Public insert allowed';exception when insufficient_privilege then null;end;
 if exists(select 1 from storage.objects where bucket_id='request-images') then raise exception 'Private image exposed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.content_requests) then raise exception 'Non-admin read allowed';end if;
 delete from public.content_requests;
 if found then raise exception 'Non-admin request deletion allowed';end if;
 begin insert into public.content_requests(kind,name,contact) values('offer','Intruder','9999999999');raise exception 'Non-admin insert allowed';exception when insufficient_privilege then null;end;
 begin insert into storage.objects(bucket_id,name) values('request-images','intruder.png');raise exception 'Non-admin image upload allowed';exception when insufficient_privilege then null;end;
 delete from storage.objects where bucket_id='request-images';
 if found then raise exception 'Non-admin image deletion allowed';end if;
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
 insert into public.content_requests(kind,name,contact,payment_amount,payment_status) values
   ('offer','Manual offer','9123456780',1000,'paid'),
   ('notice','Manual notice','person@example.test',250,'unpaid');
 update public.content_requests set payment_amount=300,payment_status='paid' where name='Manual notice';
 insert into public.ads(id,brand_name,title) values('40000000-0000-0000-0000-000000000009','Manual advertiser','Optional link');
 update public.ads set request_id=(select id from public.content_requests where name='Manual offer') where id='40000000-0000-0000-0000-000000000009';
 update public.notices set request_id=(select id from public.content_requests where name='Manual notice') where id='40000000-0000-0000-0000-000000000002';
 if not exists(select 1 from public.content_requests r join public.notices n on n.request_id=r.id where r.name='Manual notice') then raise exception 'Notice link failed';end if;
 begin update public.ads set request_id=(select id from public.content_requests where name='Manual notice') where id='40000000-0000-0000-0000-000000000009';raise exception 'Notice linked to ad';exception when check_violation then null;end;
 begin update public.notices set request_id=(select id from public.content_requests where name='Manual offer') where id='40000000-0000-0000-0000-000000000002';raise exception 'Offer linked to notice';exception when check_violation then null;end;
 begin update public.ads set request_id='99999999-0000-0000-0000-000000000000' where id='40000000-0000-0000-0000-000000000009';raise exception 'Missing request allowed';exception when check_violation or foreign_key_violation then null;end;
 begin update public.content_requests set kind='notice' where name='Manual offer';raise exception 'Linked request type changed';exception when check_violation then null;end;
 update public.ads set request_id=null where id='40000000-0000-0000-0000-000000000009';
 if not exists(select 1 from public.ads where id='40000000-0000-0000-0000-000000000009' and request_id is null) then raise exception 'Cannot unlink ad';end if;
 if not exists(select 1 from public.content_requests where name='Manual notice' and payment_amount=300 and payment_status='paid' and image_path is null) then raise exception 'Notice payment update failed';end if;
 begin update public.content_requests set payment_amount=-1;raise exception 'Negative amount allowed';exception when check_violation then null;end;
 begin update public.content_requests set payment_status='invalid';raise exception 'Invalid payment status allowed';exception when check_violation then null;end;
 insert into storage.objects(bucket_id,name) values('request-images','admin/manual.png');
 delete from storage.objects where bucket_id='request-images' and name='admin/manual.png';
 if not found then raise exception 'Admin upload cleanup failed';end if;
 update public.content_requests set status='contacted',follow_up_notes='Call back tomorrow' where id='60000000-0000-0000-0000-000000000001';
 if not found then raise exception 'Admin cannot follow up';end if;
 begin update public.content_requests set status='invalid';raise exception 'Invalid status allowed';exception when check_violation then null;end;
 update public.content_requests set name='Updated requester',contact='updated@example.test',details='Updated details',image_path=null where id='60000000-0000-0000-0000-000000000001';
 if not exists(select 1 from public.content_requests where id='60000000-0000-0000-0000-000000000001' and name='Updated requester' and contact='updated@example.test' and details='Updated details' and image_path is null) then raise exception 'Admin edit failed';end if;
 update public.ads set request_id=(select id from public.content_requests where name='Manual offer') where id='40000000-0000-0000-0000-000000000009';
 delete from public.content_requests where name in ('Manual offer','Manual notice');
 if exists(select 1 from public.content_requests where name in ('Manual offer','Manual notice')) then raise exception 'Admin deletion failed';end if;
 if not exists(select 1 from public.ads where id='40000000-0000-0000-0000-000000000009' and request_id is null) then raise exception 'Request deletion did not preserve and unlink ad';end if;
 if not exists(select 1 from public.notices where id='40000000-0000-0000-0000-000000000002' and request_id is null) then raise exception 'Request deletion did not preserve and unlink notice';end if;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.content_requests where payment_amount=1250 and payment_status='paid' and follow_up_notes like '%40000000-0000-0000-0000-000000000001%') then raise exception 'Paid ad payment not preserved';end if;
 if not exists(select 1 from public.content_requests r join public.ads a on a.request_id=r.id where r.payment_amount=1250 and a.id='40000000-0000-0000-0000-000000000001') then raise exception 'Historical ad link not recovered';end if;
 if not exists(select 1 from public.content_requests where payment_amount=500 and payment_status='unpaid' and details='Unpaid campaign') then raise exception 'Unpaid ad payment not preserved';end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ads' and column_name in ('price','payment_status')) then raise exception 'Ad payment columns remain';end if;
 if exists(select 1 from storage.buckets where id='request-images' and public) then raise exception 'Request bucket is public';end if;
end $$;
rollback;
