-- Device tokens (FCM) + admin-authored push notification records.
-- Isolated for reuse: job-post / interest / deal hooks can call the webapp send helpers later.

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_token text not null,
  device_id text,
  device_name text,
  device_os text,
  os_version text,
  app_version text,
  is_active boolean not null default true,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_tokens_token_unique unique (device_token)
);

create index device_tokens_user_active_idx
  on public.device_tokens (user_id)
  where is_active = true;

create index device_tokens_active_idx
  on public.device_tokens (is_active)
  where is_active = true;

-- One logical device per user (when device_id is known).
create unique index device_tokens_user_device_id_uidx
  on public.device_tokens (user_id, device_id)
  where device_id is not null and device_id <> '';

create trigger device_tokens_updated_at before update on public.device_tokens
  for each row execute function public.set_updated_at();

alter table public.device_tokens enable row level security;

create policy "device_tokens_select_own"
  on public.device_tokens
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "device_tokens_insert_own"
  on public.device_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "device_tokens_update_own"
  on public.device_tokens
  for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "device_tokens_delete_own"
  on public.device_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

grant select, insert, update, delete on table public.device_tokens to authenticated, service_role;

comment on table public.device_tokens is
  'FCM registration tokens per user device. Upserted by mobile via webapp API.';

-- ---------------------------------------------------------------------------

create table public.push_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message_body text not null,
  image text,
  entry_datetime timestamptz not null default now(),
  sent_datetime timestamptz,
  sent_count integer not null default 0,
  sent_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_notifications_entry_idx
  on public.push_notifications (entry_datetime desc);

create trigger push_notifications_updated_at before update on public.push_notifications
  for each row execute function public.set_updated_at();

alter table public.push_notifications enable row level security;

create policy "push_notifications_admin_select"
  on public.push_notifications
  for select
  to authenticated
  using (public.is_admin());

create policy "push_notifications_admin_insert"
  on public.push_notifications
  for insert
  to authenticated
  with check (public.is_admin());

create policy "push_notifications_admin_update"
  on public.push_notifications
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "push_notifications_admin_delete"
  on public.push_notifications
  for delete
  to authenticated
  using (public.is_admin());

grant select, insert, update, delete on table public.push_notifications to authenticated, service_role;

comment on table public.push_notifications is
  'Admin-authored push campaigns. Sending is performed by the webapp FCM service.';
