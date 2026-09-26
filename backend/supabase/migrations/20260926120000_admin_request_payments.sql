begin;

alter table public.content_requests
  alter column image_path drop not null,
  add column payment_amount integer check (payment_amount >= 0),
  add column payment_status text not null default 'unpaid'
    check (payment_status in ('paid', 'unpaid'));

comment on column public.content_requests.payment_amount is 'Amount charged for the offer or notification (INR).';

grant insert on public.content_requests to authenticated;
create policy content_requests_admin_insert on public.content_requests
  for insert to authenticated with check (public.is_admin());
create policy request_images_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'request-images' and public.is_admin());
create policy request_images_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'request-images' and public.is_admin());

-- Existing ads have no request/contact association. Preserve recorded payments
-- as historical requests, with the original ad ID in the private notes.
insert into public.content_requests
  (kind, name, contact, details, status, follow_up_notes, payment_amount, payment_status, created_at)
select 'offer', left(coalesce(nullif(trim(brand_name), ''), 'Existing ad') || ' (historical)', 100),
  'Not recorded', left(title, 2000), case when is_deleted then 'closed' else 'published' end,
  'Historical payment migrated from ad ' || id::text || '. Contact was not recorded on the ad.',
  price, payment_status, created_at
from public.ads
where price is not null or payment_status = 'paid';

alter table public.ads drop column price, drop column payment_status;
comment on table public.content_requests is 'Private offer and notification enquiries, entered by admins or submitted through the public API. Includes payment and follow-up tracking; does not publish content.';

commit;
