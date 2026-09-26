begin;
grant delete on public.content_requests to authenticated;
create policy content_requests_admin_delete on public.content_requests
  for delete to authenticated using (public.is_admin());
notify pgrst, 'reload schema';
commit;
