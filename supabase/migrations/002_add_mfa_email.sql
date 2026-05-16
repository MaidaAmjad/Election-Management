-- Optional email OTP two-factor authentication flag on profiles
alter table public.profiles
  add column if not exists mfa_email_enabled boolean not null default false;

comment on column public.profiles.mfa_email_enabled is
  'When true, user must verify an email OTP after password login';
