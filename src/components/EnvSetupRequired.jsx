export function hasSupabaseEnv() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL?.trim() &&
      import.meta.env.VITE_SUPABASE_ANON_KEY?.trim(),
  );
}

export default function EnvSetupRequired() {
  const isVercel =
    typeof window !== 'undefined' && /vercel\.app/i.test(window.location.hostname);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="max-w-lg rounded-xl border border-amber-200 bg-white p-8 shadow-lg">
        <h1 className="text-xl font-bold text-slate-900">Configuration required</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          This app cannot connect to Supabase because environment variables were not set
          {isVercel ? ' in your Vercel project' : ''} at <strong>build time</strong>.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Open{' '}
            {isVercel ? (
              <strong>Vercel → Project → Settings → Environment Variables</strong>
            ) : (
              <strong>
                your <code className="rounded bg-slate-100 px-1 text-xs">.env</code> file
              </strong>
            )}
            .
          </li>
          <li>
            Add (from Supabase Dashboard → Project Settings → API):
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_APP_URL=https://your-app.vercel.app`}
            </pre>
          </li>
          <li>
            {isVercel
              ? 'Redeploy the project (Deployments → … → Redeploy) so Vite embeds the new values.'
              : 'Restart `npm run dev` after saving `.env`.'}
          </li>
        </ol>
        <p className="mt-4 text-xs text-slate-500">
          Names must start with <code className="rounded bg-slate-100 px-1">VITE_</code>. Without
          them, production may show a blank page.
        </p>
      </div>
    </div>
  );
}
