begin;
do $$ declare name text; begin
 foreach name in array array['profiles','businesses','business_requests','business_service_areas','live_sessions','categories','category_groups','landmarks','otp_codes','ad_user_clicks'] loop
   if to_regclass('public.'||name) is not null then raise exception 'Retired table remains: %',name;end if;
 end loop;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like '%business%' or p.proname in ('record_ad_click','handle_new_user','profiles_sync_location','create_other_category'))) then raise exception 'Retired RPC remains';end if;
 if exists(select 1 from auth.users where id='30000000-0000-0000-0000-000000000001') then raise exception 'Customer auth retained';end if;
 if not exists(select 1 from auth.users where id='30000000-0000-0000-0000-000000000002' and banned_until is null) then raise exception 'Admin auth lost';end if;
 if not exists(select 1 from public.ads where title='Preserved offer') or not exists(select 1 from public.notices where title='Preserved notice') then raise exception 'Content lost';end if;
 if exists(select 1 from public.device_tokens where device_token='legacy-token') or not exists(select 1 from public.device_tokens where device_token='anonymous-token') then raise exception 'Token retirement incorrect';end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='device_tokens' and column_name in ('user_id','device_name','device_id','os_version')) then raise exception 'Device personal metadata remains';end if;
 if exists(select 1 from public.api_rate_limits) then raise exception 'Historical identifiers retained';end if;
 if exists(select 1 from storage.buckets where id='business-photos' and public) or exists(select 1 from pg_policies where schemaname='storage' and policyname like 'business_photos_%') then raise exception 'Photos accessible';end if;
end $$;
insert into public.ads(brand_name,title,is_active) values('Hidden','Hidden offer',false);
insert into public.notices(title,is_active) values('Hidden notice',false);
set local role anon;
do $$ begin
 if not exists(select 1 from public.ads where title='Preserved offer') or exists(select 1 from public.ads where title='Hidden offer') then raise exception 'Public offer visibility broken';end if;
 if not exists(select 1 from public.notices where title='Preserved notice') or exists(select 1 from public.notices where title='Hidden notice') then raise exception 'Public notice visibility broken';end if;
 if exists(select 1 from public.device_tokens) then raise exception 'Tokens leaked';end if;
 if exists(select 1 from public.admins) then raise exception 'Admin details leaked';end if;
 begin insert into public.ads(brand_name,title) values('Intruder','Unauthorized');raise exception 'Public publication allowed';exception when insufficient_privilege then null;end;
 begin insert into public.device_tokens(device_token) values('bypass-token');raise exception 'Registration bypass allowed';exception when insufficient_privilege then null;end;
 perform public.ads_covering(null,null,null);
 perform public.notices_covering(null,null,null);
end $$;
reset role;
-- A still-valid JWT from a deleted customer must not gain admin rights.
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ begin
 if public.is_admin() then raise exception 'Retired customer is admin';end if;
 begin perform public.upsert_locality('425001','Unauthorized');raise exception 'Customer locality write allowed';exception when raise_exception then if sqlerrm <> 'Admin access required' then raise;end if;end;
 begin insert into public.notices(title) values('Unauthorized');raise exception 'Customer notice write allowed';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.device_tokens) then raise exception 'Customer token access allowed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ begin
 if not public.is_admin() then raise exception 'Admin access lost';end if;
 update public.ads set title='Admin edited offer' where title='Preserved offer';
 if not found then raise exception 'Admin offer update failed';end if;
 insert into public.notices(title) values('Admin notice');
 insert into public.push_notifications(title,message_body) values('Admin push','Test broadcast');
 perform public.upsert_locality('425001','Admin area');
 if not exists(select 1 from public.device_tokens where device_token='anonymous-token') then raise exception 'Admin token read failed';end if;
end $$;
reset role;
rollback;
