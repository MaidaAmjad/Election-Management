-- =============================================================================
-- Email OTP / reset tokens (used by Resend edge function — not Supabase Auth mail)
-- =============================================================================

create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  purpose text not null
    constraint email_verification_codes_purpose_check check (
      purpose in ('mfa', 'password_reset')
    ),
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_codes_email_purpose_idx
  on public.email_verification_codes (email, purpose, created_at desc);

alter table public.email_verification_codes enable row level security;

-- Only service role (edge functions) should access this table.
