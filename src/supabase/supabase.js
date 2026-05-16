import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client — Election Management
 *
 * Credentials are loaded from Vite environment variables (never hard-code keys here).
 *
 * 1. Create a `.env` file in the project root (same folder as package.json).
 * 2. Paste your Supabase project values from:
 *    Dashboard → Project Settings → API
 *    (Project: "Election Management")
 *
 *    .env
 *    ─────────────────────────────────────────────────────────
 *    VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
 *    VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *    ─────────────────────────────────────────────────────────
 *
 * 3. Restart the dev server after changing `.env` (`npm run dev`).
 *
 * Vite only exposes variables prefixed with `VITE_` to client code via import.meta.env.
 * @see https://vite.dev/guide/env-and-mode
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Add them to your .env file and restart the dev server.',
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
