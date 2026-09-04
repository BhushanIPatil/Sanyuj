-- App-owned rate limits for sensitive auth / account APIs (service role only).
-- Swap-friendly: webapp calls check_and_consume_rate_limit via an adapter layer.

create table public.api_rate_limits (
  action text not null,
  subject_type text not null check (subject_type in ('email', 'ip', 'user')),
  subject_key text not null,
  window_started_at timestamptz not null default now(),
  hit_count integer not null default 0 check (hit_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (action, subject_type, subject_key)
);

create index api_rate_limits_updated_at_idx on public.api_rate_limits (updated_at);

alter table public.api_rate_limits enable row level security;

-- No anon/authenticated policies: only service_role (and security definer RPC) may use this.

grant select, insert, update, delete on table public.api_rate_limits to service_role;

comment on table public.api_rate_limits is
  'Fixed-window rate limit counters for auth/account APIs. Not client-accessible.';

-- Atomically check and (if allowed) consume one hit in the current window.
-- Returns jsonb: { allowed, remaining, retry_after_seconds }
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
  if p_subject_type not in ('email', 'ip', 'user') then
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
