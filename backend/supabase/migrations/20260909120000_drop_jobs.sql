-- Remove job posting and provider job interests completely.
-- Existing environments: drops tables, functions, types, and jobs_done.
-- Fresh installs still create jobs in older migrations, then this removes them.

drop trigger if exists jobs_one_per_day on public.jobs;
drop function if exists public.enforce_one_job_per_user_per_day();
drop function if exists public.jobs_covered_by_business(uuid);

drop table if exists public.job_interests cascade;
drop table if exists public.jobs cascade;

drop type if exists public.interest_status;
drop type if exists public.job_urgency;
drop type if exists public.job_status;

alter table public.businesses drop column if exists jobs_done;
