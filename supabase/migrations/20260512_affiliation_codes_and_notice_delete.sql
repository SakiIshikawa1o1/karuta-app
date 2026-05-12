alter table public.affiliations
add column if not exists approval_code text;

alter table public.affiliations
drop constraint if exists affiliations_approval_code_check;

alter table public.affiliations
add constraint affiliations_approval_code_check
check (approval_code ~ '^[0-9]{4}$');

create or replace function public.is_system_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.is_active = true
      and r.code = 'system_admin'
  );
$$;

create or replace function public.validate_affiliation_code(
  p_affiliation_id uuid,
  p_input_code text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.affiliations a
    where a.id = p_affiliation_id
      and a.is_active = true
      and a.approval_code = p_input_code
      and p_input_code ~ '^[0-9]{4}$'
  );
$$;

create or replace function public.check_new_user_affiliation_code()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_affiliation_id uuid;
  v_input_code text;
begin
  if coalesce(new.raw_user_meta_data, '{}'::jsonb) ? 'affiliation_id' then
    v_affiliation_id := (new.raw_user_meta_data->>'affiliation_id')::uuid;
    v_input_code := new.raw_user_meta_data->>'affiliation_approval_code';

    if not public.validate_affiliation_code(v_affiliation_id, v_input_code) then
      raise exception 'invalid affiliation approval code';
    end if;

    new.raw_user_meta_data :=
      new.raw_user_meta_data - 'affiliation_approval_code';
  end if;

  return new;
end;
$$;

drop trigger if exists check_new_user_affiliation_code on auth.users;
create trigger check_new_user_affiliation_code
before insert on auth.users
for each row execute function public.check_new_user_affiliation_code();

create or replace function public.admin_create_affiliation(
  p_name text,
  p_representative_user_id uuid default null,
  p_approval_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_affiliation_id uuid;
begin
  if not public.is_system_admin() then
    raise exception 'not authorized';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'affiliation name is required';
  end if;

  if p_approval_code is null or p_approval_code !~ '^[0-9]{4}$' then
    raise exception 'approval code must be 4 digits';
  end if;

  insert into public.affiliations (
    name,
    representative_user_id,
    approval_code,
    is_active
  )
  values (
    trim(p_name),
    p_representative_user_id,
    p_approval_code,
    true
  )
  returning id into v_affiliation_id;

  return v_affiliation_id;
end;
$$;

create or replace function public.admin_update_affiliation(
  p_affiliation_id uuid,
  p_representative_user_id uuid default null,
  p_is_active boolean default true,
  p_approval_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_system_admin()
    or exists (
      select 1
      from public.affiliations a
      where a.id = p_affiliation_id
        and a.representative_user_id = auth.uid()
    )
  ) then
    raise exception 'not authorized';
  end if;

  if p_approval_code is null or p_approval_code !~ '^[0-9]{4}$' then
    raise exception 'approval code must be 4 digits';
  end if;

  update public.affiliations
  set
    representative_user_id = p_representative_user_id,
    is_active = coalesce(p_is_active, true),
    approval_code = p_approval_code,
    updated_at = now()
  where id = p_affiliation_id;
end;
$$;

create or replace function public.admin_delete_notice(p_notice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_system_admin() then
    raise exception 'not authorized';
  end if;

  delete from public.notices
  where id = p_notice_id;
end;
$$;

revoke all on function public.validate_affiliation_code(uuid, text) from public;
grant execute on function public.validate_affiliation_code(uuid, text) to anon, authenticated;

revoke all on function public.admin_create_affiliation(text, uuid, text) from public;
grant execute on function public.admin_create_affiliation(text, uuid, text) to authenticated;

revoke all on function public.admin_update_affiliation(uuid, uuid, boolean, text) from public;
grant execute on function public.admin_update_affiliation(uuid, uuid, boolean, text) to authenticated;

revoke all on function public.admin_delete_notice(uuid) from public;
grant execute on function public.admin_delete_notice(uuid) to authenticated;
