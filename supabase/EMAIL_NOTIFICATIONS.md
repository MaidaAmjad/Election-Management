# Admin approval email notifications

Approve/reject actions invoke the `send-notification-email` Edge Function (Resend API).

## Deploy

```bash
supabase functions deploy send-notification-email
```

## Secrets (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |
| `NOTIFICATION_FROM_EMAIL` | Verified sender, e.g. `Elections <noreply@yourdomain.com>` |

If secrets are missing, approve/reject still completes; emails are skipped and logged in the browser console.
