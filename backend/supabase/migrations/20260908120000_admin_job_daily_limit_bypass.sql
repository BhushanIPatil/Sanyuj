-- Allow the admin webapp (service role) to post jobs on a user's behalf
-- without hitting the one-job-per-day cap.

create or replace function public.enforce_one_job_per_user_per_day()
returns trigger
language plpgsql
as $$
declare
  already integer;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  select count(*)::integer into already
  from public.jobs j
  where j.customer_id = new.customer_id
    and (j.created_at at time zone 'Asia/Kolkata')::date
      = (timezone('Asia/Kolkata', now()))::date;

  if already >= 1 then
    raise exception 'You can only post one job per day. Try again tomorrow.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;
