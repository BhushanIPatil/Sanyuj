-- Event dates shown to neighbours are separate from starts_at/ends_at (when the notice appears).

alter table public.notices
  add column if not exists event_starts_at timestamptz,
  add column if not exists event_ends_at timestamptz;

comment on column public.notices.starts_at is 'When the notice starts appearing in the app.';
comment on column public.notices.ends_at is 'When the notice stops appearing in the app.';
comment on column public.notices.event_starts_at is 'When the event begins (shown to neighbours if set).';
comment on column public.notices.event_ends_at is 'When the event ends (shown to neighbours if set).';
