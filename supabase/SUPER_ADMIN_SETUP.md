# Super Admin account setup

Default Super Admin email: **maidaamjad32@gmail.com**

Do **not** commit passwords to git. Set the password only in `.env` or the Supabase Dashboard.

## Option A — Script (recommended)

1. In [Supabase Dashboard](https://supabase.com/dashboard) → **Project Settings** → **API**, copy the **service_role** key (secret).

2. Add to your local `.env` (already gitignored):

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPER_ADMIN_EMAIL=maidaamjad32@gmail.com
SUPER_ADMIN_PASSWORD=your-chosen-password
```

3. Run:

```bash
npm run setup:super-admin
```

4. Sign in at **`/admin/login`** (e.g. `https://your-app.vercel.app/admin/login`) with that email and password.

## Option B — Supabase Dashboard only

1. **Authentication** → **Users** → **Add user** → **Create new user**
   - Email: `maidaamjad32@gmail.com`
   - Password: (your password)
   - Auto Confirm User: **on**

2. Run in **SQL Editor**:

   `supabase/migrations/006_super_admin_maidaamjad.sql`

3. Sign in at **`/admin/login`** with that email and password.

## Troubleshooting “Invalid email or password”

This usually means the email **already exists** in Supabase but the password is different from what you expect.

**Fix A — Reset password (no service role needed)**

1. On the login page, click **Forgot password?**
2. Enter `maidaamjad32@gmail.com` and submit.
3. Open the email link and set the password to `maida@128` (or your chosen password).
4. Run `006_super_admin_maidaamjad.sql` in the SQL Editor so the profile role is **Super Admin**.
5. Sign in at **`/admin/login`**.

**Fix B — Admin script (sets password + role)**

1. Supabase Dashboard → **Settings** → **API** → copy **service_role** key.
2. Run (one line, replace `YOUR_KEY`):

```bash
npm run setup:super-admin -- YOUR_KEY
```

Or put the key in `.env` as `SUPABASE_SERVICE_ROLE_KEY` and run `npm run setup:super-admin`.

## Notes

- Super Admin cannot register via the app signup page (by design).
- If login says “Incorrect role selected”, use **`/admin/login`** (not `/login`) and run `006_super_admin_maidaamjad.sql`.
