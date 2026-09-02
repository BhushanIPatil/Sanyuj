-- Switch identity from phone to email: add profiles.email, make phone optional (required for providers in app).

alter table public.profiles
  add column if not exists email text;

-- Drop NOT NULL first — empty-string cleanup cannot set NULL while the constraint exists.
alter table public.profiles
  alter column phone drop not null;

update public.profiles
set phone = null
where phone = '';

alter table public.profiles
  drop constraint if exists profiles_phone_key;

create unique index if not exists profiles_phone_unique
  on public.profiles (phone)
  where phone is not null;

create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;

-- Backfill from auth.users (includes legacy synthetic *@users.sanyuj.app emails).
update public.profiles p
set email = lower(trim(u.email))
from auth.users u
where p.id = u.id
  and u.email is not null
  and trim(u.email) <> ''
  and p.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_phone text;
begin
  v_email := nullif(lower(trim(coalesce(new.email, new.raw_user_meta_data->>'email', ''))), '');
  v_phone := nullif(
    coalesce(new.phone, new.raw_user_meta_data->>'phone', ''),
    ''
  );

  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    v_email,
    v_phone,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email),
        phone = coalesce(excluded.phone, public.profiles.phone),
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;
