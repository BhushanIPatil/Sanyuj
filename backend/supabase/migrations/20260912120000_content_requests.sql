begin;
create table public.content_requests (
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind in ('offer','notice','service')),
 name text not null check (length(trim(name)) between 2 and 100),
 contact text not null check (length(trim(contact)) between 6 and 150),
 details text not null default '' check (length(details) <= 2000),
 image_path text not null unique,
 status text not null default 'new' check (status in ('new','contacted','published','closed')),
 follow_up_notes text not null default '' check (length(follow_up_notes) <= 4000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index content_requests_status_created_idx on public.content_requests(status,created_at desc);
create trigger content_requests_updated_at before update on public.content_requests
 for each row execute function public.set_updated_at();
alter table public.content_requests enable row level security;
revoke all on public.content_requests from anon,authenticated;
grant select,update on public.content_requests to authenticated;
grant all on public.content_requests to service_role;
create policy content_requests_admin_read on public.content_requests for select to authenticated using(public.is_admin());
create policy content_requests_admin_update on public.content_requests for update to authenticated using(public.is_admin()) with check(public.is_admin());

insert into storage.buckets(id,name,public) values('request-images','request-images',false);
create policy request_images_admin_read on storage.objects for select to authenticated
 using(bucket_id='request-images' and public.is_admin());
comment on table public.content_requests is 'Private follow-up enquiries submitted through the rate-limited public API. Submission does not publish content.';
commit;
