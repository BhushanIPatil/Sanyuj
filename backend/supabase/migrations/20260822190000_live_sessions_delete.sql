-- Allow business owners to hard-delete their own live sessions when they stop live.
drop policy if exists "live_delete_own" on public.live_sessions;
create policy "live_delete_own" on public.live_sessions
  for delete to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.owner_id = auth.uid()
        and b.is_active = true
        and b.is_deleted = false
    )
  );
