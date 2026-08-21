-- Replace profile landmark with free-text address + optional GPS coords

alter table public.profiles
  add column if not exists address text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table public.profiles
  drop constraint if exists profiles_landmark_id_fkey;

alter table public.profiles
  drop column if exists landmark_id;
