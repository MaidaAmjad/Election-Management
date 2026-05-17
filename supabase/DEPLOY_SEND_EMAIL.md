# Deploy `send-email` (fixes “Failed to send a request to the Edge Function”)

Your app calls **`send-email`**. If that function is not deployed on project `uufyjktlvhnjuiwurjyv`, forgot password and MFA will fail.

## Secrets (already on your project)

Custom secrets only — [Functions → Secrets](https://supabase.com/dashboard/project/uufyjktlvhnjuiwurjyv/functions/secrets):

| Name | Example value |
|------|----------------|
| `RESEND_API_KEY` | `re_...` from Resend |
| `NOTIFICATION_FROM_EMAIL` | `Election Management <onboarding@resend.dev>` |
| `APP_URL` | `http://localhost:5173` |

Do **not** add names starting with `SUPABASE_`. `SUPABASE_SERVICE_ROLE_KEY` is under **Default secrets** automatically.

## Option A — Deploy with CLI (recommended)

1. Install CLI: `npm install -g supabase`
2. Log in: `supabase login`
3. From the repo root:

```bash
cd path/to/Election-Management
supabase link --project-ref uufyjktlvhnjuiwurjyv
supabase functions deploy send-email
```

4. In Dashboard → Edge Functions, confirm **`send-email`** appears and status is active.

## Option B — Deploy from Dashboard

1. Open [Edge Functions](https://supabase.com/dashboard/project/uufyjktlvhnjuiwurjyv/functions).
2. **Create a new function** → name it exactly: `send-email`
3. Replace the editor contents with the file:  
   `supabase/functions/send-email/index.ts`
4. Deploy / Save.
5. Open the function → **Details** → turn off **Verify JWT** if the UI offers it (forgot password uses anon access).

## After deploy

1. Run migration `011_email_verification_codes.sql` in SQL Editor (if not done).
2. Restart `npm run dev`.
3. Test **Forgot password** again.
4. If it still fails: **Edge Functions → send-email → Logs** and read the error line.

## What is NOT your dashboard password

Your Supabase **login password** is only for the website. The app uses:

- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env` (from Project Settings → API)

Never put your dashboard login password in `.env` or code.
