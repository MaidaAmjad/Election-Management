-- Optional: approve existing Election Creator accounts created before the approval module.
insert into public.creator_requests (
  user_id,
  purpose,
  email,
  phone,
  organization,
  status
)
select
  p.id,
  'Existing election creator account (auto-approved migration)',
  u.email,
  p.phone,
  'N/A',
  'Approved'
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'Election Creator'
  and not exists (
    select 1 from public.creator_requests cr where cr.user_id = p.id
  );
