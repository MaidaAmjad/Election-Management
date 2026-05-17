# Email (Resend) — whole project

All email is sent through the **`send-email`** Supabase Edge Function using [Resend](https://resend.com). Supabase Auth built-in emails are **not** used.

| Flow | How it works |
|------|----------------|
| MFA / 2FA codes | `mfa_send` / `mfa_verify` |
| Password reset | `password_reset_send` / `password_reset_complete` |
| Sign-up email verification | `signup_verification_send` / `signup_verification_verify` (60s resend cooldown) |
| Creator approved/rejected | `creator_approved_notify` / `creator_rejected_notify` + in-app notification |
| Secret ID delivery | `secret_id_send` / `secret_id_send_all` + `email_logs` |
| Election reminders (24h, 1h) | `email_schedules` + `process_scheduled_emails` |
| Election ended / winner | `process_scheduled_emails` (after publish / finalize) |
| In-app bell & center | `notifications` table + Realtime |

## 1. Supabase Auth settings

In **Authentication → Providers → Email**:

- You may disable “Confirm email” if you rely on `confirm_signup_email` after sign-up.
- Do not depend on Supabase SMTP for MFA or password reset.

## 2. Database migration

Run migrations through **`016_notifications.sql`** in the SQL Editor (includes `011` verification codes + notification tables).

## 3. Edge Function secrets

**Dashboard → Edge Functions → Secrets** (or `supabase secrets set`):

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | Your Resend API key |
| `NOTIFICATION_FROM_EMAIL` | Sender, e.g. `Election Management <onboarding@resend.dev>` |
| `APP_URL` | Site URL, e.g. `http://localhost:5173` or production URL |

**Do not add** secrets starting with `SUPABASE_` — Supabase blocks that prefix.

These are **default secrets** (already on your project, scroll to “Default secrets”):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` ← used for password reset & sign-up confirm

The `send-email` function reads `SUPABASE_SERVICE_ROLE_KEY` from those defaults automatically.

## 4. Deploy

See **[DEPLOY_SEND_EMAIL.md](./DEPLOY_SEND_EMAIL.md)** for full steps (CLI or Dashboard).

```bash
supabase link --project-ref uufyjktlvhnjuiwurjyv
supabase functions deploy send-email
```

Until `send-email` is deployed, the app shows: *Failed to send a request to the Edge Function*.

## 5. Local `.env`

**Never put `VITE_RESEND_API_KEY` in the browser** — Resend keys belong only in Edge Function secrets.

For the React app, set:

```env
VITE_APP_URL=http://localhost:5173
```

For reference and local tooling, set in `.env` (gitignored):

```env
RESEND_API_KEY=re_xxxx
NOTIFICATION_FROM_EMAIL=Election Management <onboarding@resend.dev>
APP_URL=http://localhost:5173
```

The browser **never** sees `RESEND_API_KEY`; only the edge function uses it.

## 6. Resend sender domain

Until you verify a domain in Resend, use the test sender:

`onboarding@resend.dev`

After domain verification, update `NOTIFICATION_FROM_EMAIL` to your domain.

## 7. Security

- Rotate your Resend API key if it was ever shared in chat or committed.
- Never add `RESEND_API_KEY` to `VITE_*` variables.
