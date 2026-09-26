begin;

alter table public.content_requests
  add column ad_id uuid references public.ads(id) on delete set null,
  add column notice_id uuid references public.notices(id) on delete set null,
  add constraint content_requests_content_kind_check check (
    (ad_id is null or kind = 'offer') and
    (notice_id is null or kind = 'notice')
  );

create index content_requests_ad_idx on public.content_requests(ad_id) where ad_id is not null;
create index content_requests_notice_idx on public.content_requests(notice_id) where notice_id is not null;

-- Recover the exact association recorded by the payment migration.
update public.content_requests r set ad_id = a.id
from public.ads a
where r.kind = 'offer' and r.contact = 'Not recorded'
  and r.follow_up_notes = 'Historical payment migrated from ad ' || a.id::text || '. Contact was not recorded on the ad.';

commit;
