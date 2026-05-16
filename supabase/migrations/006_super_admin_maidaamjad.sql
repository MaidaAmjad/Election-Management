-- =============================================================================
-- Promote Super Admin account (run AFTER the auth user exists in Supabase)
-- Email: maidaamjad32@gmail.com
-- Create the user first via Dashboard or: npm run setup:super-admin
-- =============================================================================

update auth.users
set
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'role', 'Super Admin',
      'full_name', coalesce(raw_user_meta_data ->> 'full_name', 'Super Admin')
    )
where email = 'maidaamjad32@gmail.com';

insert into public.profiles (id, full_name, phone, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', 'Super Admin'),
  coalesce(u.raw_user_meta_data ->> 'phone', ''),
  'Super Admin'
from auth.users u
where u.email = 'maidaamjad32@gmail.com'
on conflict (id) do update
set role = 'Super Admin';
