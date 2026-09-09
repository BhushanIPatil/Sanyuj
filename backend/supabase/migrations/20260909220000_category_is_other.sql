-- Custom "Other" categories: providers can submit a name that is stored as a
-- pending category (is_other = true). Admins rename it and clear the flag to
-- publish it, or move businesses onto an existing category.

alter table public.categories
  add column if not exists is_other boolean not null default false;

create index if not exists categories_is_other_idx
  on public.categories (is_other)
  where is_other = true and is_deleted = false;

create unique index if not exists categories_other_name_lower_idx
  on public.categories (lower(name))
  where is_other = true and is_deleted = false;

insert into public.category_groups (slug, name, sort_order, is_active)
values ('other', 'Other', 99, true)
on conflict (slug) do nothing;

comment on column public.categories.is_other is
  'True when a provider submitted this name via Other. Hidden from public pickers until an admin publishes it.';

create or replace function public.create_other_category(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_id uuid;
  v_group_id uuid;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  v_name := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  if v_name is null or char_length(v_name) < 2 then
    raise exception 'Enter a category name';
  end if;
  if char_length(v_name) > 60 then
    raise exception 'Category name is too long';
  end if;

  -- Reuse an official category with the same name so "Plumber" is not queued as Other.
  select c.id into v_id
  from public.categories c
  join public.category_groups g on g.id = c.group_id
  where c.is_deleted = false
    and c.is_active = true
    and c.is_other = false
    and g.is_deleted = false
    and g.is_active = true
    and g.slug <> 'other'
    and lower(c.name) = lower(v_name)
  order by c.sort_order
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  select c.id into v_id
  from public.categories c
  where c.is_other = true
    and c.is_deleted = false
    and lower(c.name) = lower(v_name)
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  select id into v_group_id
  from public.category_groups
  where slug = 'other'
    and is_deleted = false
  limit 1;

  if v_group_id is null then
    raise exception 'Other category group is not configured';
  end if;

  v_slug := 'other_' || replace(gen_random_uuid()::text, '-', '');

  begin
    insert into public.categories (
      group_id, slug, name, is_other, is_active, is_deleted, sort_order
    ) values (
      v_group_id, v_slug, v_name, true, true, false, 0
    )
    returning id into v_id;
  exception
    when unique_violation then
      select c.id into v_id
      from public.categories c
      where c.is_other = true
        and c.is_deleted = false
        and lower(c.name) = lower(v_name)
      limit 1;
      if v_id is null then
        raise;
      end if;
  end;

  return v_id;
end;
$$;

revoke all on function public.create_other_category(text) from public;
grant execute on function public.create_other_category(text) to authenticated;
