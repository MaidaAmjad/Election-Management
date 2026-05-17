/**
 * @deprecated Deploy and use `send-email` instead.
 * This handler forwards to the same Resend logic for backward compatibility.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey || anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'send', ...body }),
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
