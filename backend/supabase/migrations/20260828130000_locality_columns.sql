-- Add locality (area/post office name from pincode lookup) to profiles and jobs

alter table public.profiles
  add column if not exists locality text;

alter table public.jobs
  add column if not exists locality text;

create index if not exists jobs_status_pincode_locality_idx
  on public.jobs (status, pincode, locality);
