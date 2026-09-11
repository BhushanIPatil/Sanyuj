-- Offerly and notifications only. Destructive retirement of directory/customer data.
-- Before applying: disable hosted signup and run scripts/retire-directory-data.cjs.
-- Keep historical migrations unchanged so existing installations can migrate forward.
begin;

-- Block old business images immediately. Physical objects must be removed via Storage API.
update storage.buckets set public = false where id = 'business-photos';
do $$ declare p record; begin
 for p in select schemaname, tablename, policyname from pg_policies
   where schemaname='storage' and policyname like 'business_photos_%'
 loop execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
-- Explicitly retire PL/pgSQL RPCs too: dropping tables alone can leave callable functions.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in (
 'handle_new_user','profiles_sync_location','jobs_sync_location','bsa_validate',
 'businesses_default_coverage','business_covers','businesses_covering','business_covers_pincode',
 'jobs_covered_by_business','replace_pincode_coverage','replace_business_coverage',
 'review_business_request','delete_own_business','create_other_category','record_ad_click',
 'enforce_one_job_per_user_per_day')
 loop execute format('drop function if exists %s cascade',f.signature); end loop;
end $$;

drop table if exists public.business_requests, public.live_sessions,
 public.business_service_areas, public.businesses, public.ad_user_clicks,
 public.profiles, public.otp_codes, public.categories, public.category_groups,
 public.landmarks cascade;

alter table public.ads drop column is_home_screen;

-- Keep only anonymous delivery information; discard all historical account-linked tokens.
-- Current apps will register a fresh account-free token after notification consent.
delete from public.device_tokens where user_id is not null;
alter table public.device_tokens
 drop column user_id, drop column device_id, drop column device_name, drop column os_version;
comment on table public.device_tokens is 'Anonymous FCM delivery registrations. No customer account, contact or hardware identity.';

-- Supabase cascades auth-owned identities and sessions. Preserve ALL admin accounts,
-- including inactive admins; their status still gates admin access through is_admin().
-- Storage cleanup must precede this for installations with legacy object ownership FKs.
delete from auth.users u where not exists (select 1 from public.admins a where a.id=u.id);

-- Remove historical auth/request counters, including submitted phone/email identifiers.
truncate table public.api_rate_limits;
alter table public.api_rate_limits drop constraint api_rate_limits_subject_type_check;
alter table public.api_rate_limits add constraint api_rate_limits_subject_type_check check(subject_type='ip');
comment on table public.api_rate_limits is 'Private short-lived abuse controls for anonymous notification registration.';

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
  if not public.is_admin() then
    raise exception 'Admin access required';
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


create or replace function public.check_and_consume_rate_limit(
  p_action text,
  p_subject_type text,
  p_subject_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_hit_count integer;
  v_allowed boolean;
  v_remaining integer;
  v_retry_after integer := 0;
begin
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'action required';
  end if;
  if p_subject_type is distinct from 'ip' then
    raise exception 'invalid subject_type';
  end if;
  if p_subject_key is null or length(trim(p_subject_key)) = 0 then
    raise exception 'subject_key required';
  end if;
  if p_limit is null or p_limit < 1 or p_window_seconds is null or p_window_seconds < 1 then
    return jsonb_build_object(
      'allowed', true,
      'remaining', coalesce(p_limit, 0),
      'retry_after_seconds', 0
    );
  end if;

  delete from public.api_rate_limits where updated_at < v_now - interval '1 day';

  insert into public.api_rate_limits as r (
    action, subject_type, subject_key, window_started_at, hit_count
  )
  values (
    p_action, p_subject_type, lower(trim(p_subject_key)), v_now, 0
  )
  on conflict (action, subject_type, subject_key) do nothing;

  select r.window_started_at, r.hit_count
    into v_window_start, v_hit_count
  from public.api_rate_limits r
  where r.action = p_action
    and r.subject_type = p_subject_type
    and r.subject_key = lower(trim(p_subject_key))
  for update;

  if v_window_start + make_interval(secs => p_window_seconds) <= v_now then
    v_window_start := v_now;
    v_hit_count := 0;
  end if;

  if v_hit_count >= p_limit then
    v_allowed := false;
    v_remaining := 0;
    v_retry_after := greatest(
      1,
      ceil(
        extract(
          epoch from (v_window_start + make_interval(secs => p_window_seconds) - v_now)
        )
      )::integer
    );
  else
    v_hit_count := v_hit_count + 1;
    v_allowed := true;
    v_remaining := greatest(0, p_limit - v_hit_count);

    update public.api_rate_limits
    set
      window_started_at = v_window_start,
      hit_count = v_hit_count,
      updated_at = v_now
    where action = p_action
      and subject_type = p_subject_type
      and subject_key = lower(trim(p_subject_key));
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'retry_after_seconds', v_retry_after
  );
end;
$$;

revoke all on function public.check_and_consume_rate_limit(text, text, text, integer, integer)
  from public, anon, authenticated;

grant execute on function public.check_and_consume_rate_limit(text, text, text, integer, integer)
  to service_role;

comment on function public.check_and_consume_rate_limit(text, text, text, integer, integer) is
  'Service-role rate limit check+consume. Webapp adapter can later call a different backend.';

commit;
