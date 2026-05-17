-- One-time helper: grant Voter role to an existing account by email.
-- Requires migration 020_user_roles_multi_role.sql to be applied first.
-- Replace the email below, then run in Supabase SQL Editor.

do $$
declare
  v_user_id uuid;
  v_email text := 'maidaamjad128@gmail.com';
begin
  select id into v_user_id from auth.users where lower(email) = lower(v_email);

  if v_user_id is null then
    raise exception 'No auth user found for %', v_email;
  end if;

  insert into public.user_roles (user_id, role)
  values (v_user_id, 'Voter')
  on conflict (user_id, role) do nothing;

  update public.profiles set role = 'Voter' where id = v_user_id;

  raise notice 'Voter role added for user %', v_user_id;
end;
$$;
