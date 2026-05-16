/**
 * One-time local setup: create or update the Super Admin auth user + profile.
 *
 * Requires in `.env` (never commit):
 *   SUPABASE_SERVICE_ROLE_KEY=...  (Dashboard → Settings → API → service_role)
 *   SUPER_ADMIN_EMAIL=maidaamjad32@gmail.com
 *   SUPER_ADMIN_PASSWORD=your-password
 *
 * Usage: npm run setup:super-admin
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const url = process.env.VITE_SUPABASE_URL;
// Pass key as first CLI arg: npm run setup:super-admin -- YOUR_SERVICE_ROLE_KEY
const serviceRoleKey =
  process.argv[2]?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SUPER_ADMIN_EMAIL ?? 'maidaamjad32@gmail.com';
const password = process.env.SUPER_ADMIN_PASSWORD;

if (!url || !serviceRoleKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env',
  );
  process.exit(1);
}

if (!password) {
  console.error(
    'Missing SUPER_ADMIN_PASSWORD in .env (do not commit this value).',
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listData, error: listError } = await admin.auth.admin.listUsers();

if (listError) {
  console.error('Failed to list users:', listError.message);
  process.exit(1);
}

const existing = listData.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase(),
);

let userId = existing?.id;

if (existing) {
  const { error: updateError } = await admin.auth.admin.updateUserById(
    existing.id,
    {
      password,
      email_confirm: true,
      user_metadata: {
        ...existing.user_metadata,
        role: 'Super Admin',
        full_name: existing.user_metadata?.full_name ?? 'Super Admin',
      },
    },
  );

  if (updateError) {
    console.error('Failed to update user:', updateError.message);
    process.exit(1);
  }

  console.log('Updated existing user password and metadata.');
} else {
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'Super Admin',
        full_name: 'Super Admin',
        phone: '',
      },
    });

  if (createError) {
    console.error('Failed to create user:', createError.message);
    process.exit(1);
  }

  userId = created.user.id;
  console.log('Created Super Admin auth user.');
}

const { error: profileError } = await admin.from('profiles').upsert(
  {
    id: userId,
    full_name: 'Super Admin',
    phone: '',
    role: 'Super Admin',
  },
  { onConflict: 'id' },
);

if (profileError) {
  console.error('Failed to upsert profile:', profileError.message);
  process.exit(1);
}

console.log('Super Admin ready.');
console.log(`  Email: ${email}`);
console.log('  Role: Super Admin');
console.log('Sign in at /choose-role → Super Admin → Login.');
