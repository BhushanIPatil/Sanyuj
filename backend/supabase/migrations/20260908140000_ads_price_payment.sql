-- Campaign price and payment status for sponsored ads.

alter table public.ads
  add column if not exists price integer,
  add column if not exists payment_status text not null default 'unpaid';

alter table public.ads drop constraint if exists ads_price_nonnegative_chk;
alter table public.ads
  add constraint ads_price_nonnegative_chk check (price is null or price >= 0);

alter table public.ads drop constraint if exists ads_payment_status_chk;
alter table public.ads
  add constraint ads_payment_status_chk check (payment_status in ('paid', 'unpaid'));

comment on column public.ads.price is 'Amount charged to the advertiser for this campaign (INR).';
comment on column public.ads.payment_status is 'Whether the advertiser has paid: paid or unpaid.';
