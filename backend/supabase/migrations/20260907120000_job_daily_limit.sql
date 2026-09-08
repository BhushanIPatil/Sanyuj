-- One job post per user per calendar day (Asia/Kolkata).
-- Soft-deleted jobs still count so delete-and-repost cannot bypass the limit.
-- Edits (UPDATE) are not limited.

create index if not exists jobs_customer_created_idx
  on public.jobs (customer_id, created_at desc);

create or replace function public.enforce_one_job_per_user_per_day()
returns trigger
language plpgsql
as $$
declare
  already integer;
begin
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

drop trigger if exists jobs_one_per_day on public.jobs;
create trigger jobs_one_per_day
  before insert on public.jobs
  for each row
  execute function public.enforce_one_job_per_user_per_day();
