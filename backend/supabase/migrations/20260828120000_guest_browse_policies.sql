-- Allow signed-out guests to browse public listings (providers, live sessions).
-- Writes (jobs, businesses, profile edits) remain authenticated-only.

drop policy if exists "businesses_read" on public.businesses;
create policy "businesses_read" on public.businesses
  for select to authenticated, anon
  using (is_active = true and is_deleted = false);

drop policy if exists "live_read" on public.live_sessions;
create policy "live_read" on public.live_sessions
  for select to authenticated, anon
  using (is_active = true and is_deleted = false);

drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated" on public.profiles
  for select to authenticated, anon
  using (
    auth.uid() = id
    or (is_active = true and is_deleted = false)
  );
