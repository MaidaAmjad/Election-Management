# Email (Brevo) — whole project

All email is sent through the **`send-email`** Supabase Edge Function using [Brevo](https://www.brevo.com/). Supabase Auth built-in emails are **not** used.

| Flow | How it works |
|------|----------------|
| MFA / 2FA codes | `mfa_send` / `mfa_verify` |
| Password reset | `password_reset_send` / `password_reset_complete` |
| Sign-up email verification | `signup_verification_send` / `signup_verification_verify` (60s resend cooldown) |
| Creator approved/rejected | `creator_approved_notify` / `creator_rejected_notify` + in-app notification |
| Election approved/rejected | `election_approved_notify` / `election_rejected_notify` |
| Secret ID delivery | `secret_id_send` / `secret_id_registration_notify` + `email_logs` |
| Election reminders (24h, 1h) | `email_schedules` + `process_scheduled_emails` |
| Election ended / winner | `process_scheduled_emails` (after publish / finalize) |
| In-app bell & center | `notifications` table + Realtime |

## Edge Function secrets

**Dashboard → Edge Functions → Secrets**:

| Secret | Description |
|--------|-------------|
| `BREVO_API_KEY` | API key from Brevo → Settings → SMTP & API → API keys |
| `NOTIFICATION_FROM_EMAIL` | `Election Management <noreply@your-verified-domain.com>` |
| `BREVO_SENDER_EMAIL` | Optional fallback sender address |
| `APP_URL` | Site URL (production Vercel URL) |

Do **not** add secrets starting with `SUPABASE_`.

## Sender domain

The **From** address must be a sender you verified in Brevo (Senders & IP → Senders).

## Deploy

See **[DEPLOY_SEND_EMAIL.md](./DEPLOY_SEND_EMAIL.md)**.

```bash
supabase functions deploy send-email
```

Deploy **`index.ts`** and **`emailTemplates.ts`** together.

## Security

- Never commit `BREVO_API_KEY` or put it in `VITE_*` variables.
- Rotate the API key immediately if it was shared in chat or committed to git.
