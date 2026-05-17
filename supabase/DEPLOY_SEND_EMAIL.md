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

`send-email` is **two files**. Pasting only `index.ts` fails with:

`Module not found ... emailTemplates.ts`

1. Open [Edge Functions](https://supabase.com/dashboard/project/uufyjktlvhnjuiwurjyv/functions) → **send-email**.
2. In the file tree, ensure you have **both** files (use **+ New file** if needed):
   - `index.ts` — paste from `supabase/functions/send-email/index.ts`
   - `emailTemplates.ts` — paste from `supabase/functions/send-email/emailTemplates.ts`
3. **Deploy** (both files must be saved before deploy).
4. Optional: **Details** → turn off **Verify JWT** only if forgot-password flows require anon access without a session.

Do not merge the templates into `index.ts` unless you inline the whole `emailTemplates.ts` content; the import path must stay `./emailTemplates.ts`.

## After deploy

1. Run migration `011_email_verification_codes.sql` in SQL Editor (if not done).
2. Restart `npm run dev`.
3. Test **Forgot password** again.
4. If it still fails: **Edge Functions → send-email → Logs** and read the error line.

## What is NOT your dashboard password

Your Supabase **login password** is only for the website. The app uses:

- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env` (from Project Settings → API)

Never put your dashboard login password in `.env` or code.
