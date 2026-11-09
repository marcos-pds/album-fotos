import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

// This endpoint performs password authentication only; it never provisions users.
// The mapping from a nickname to a verified account is private in Postgres.
// Admin credentials remain in the Edge Function environment (never in the browser).
const allowedOrigins = new Set([
  'https://marcos-pds.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function answer(origin: string, body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
      Vary: 'Origin',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

function readKey(name: string, fallbackName: string): string {
  try {
    const values = JSON.parse(Deno.env.get(name) ?? '{}') as Record<string,string>;
    if (values.default) return values.default;
  } catch { /* legacy key fallback below */ }
  return Deno.env.get(fallbackName) ?? '';
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin') ?? '';
  if (!allowedOrigins.has(origin)) {
    return new Response('Origem não autorizada', { status: 403 });
  }
  if (request.method === 'OPTIONS') return answer(origin, {}, 204);
  if (request.method !== 'POST') return answer(origin, { error: 'Método não permitido' }, 405);

  let input: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return answer(origin, { error: 'Requisição inválida' }, 400);
    input = JSON.parse(raw);
  } catch { return answer(origin, { error: 'Requisição inválida' }, 400); }

  if (!input || typeof input !== 'object') return answer(origin, { error: 'Requisição inválida' }, 400);
  const { alias, password } = input as Record<string,unknown>;
  if (!['Rayssa.Lima', 'Marcos.Paulo'].includes(String(alias)) ||
      typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return answer(origin, { error: 'Usuário ou senha inválidos' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const adminKey = readKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
  const publicKey = readKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
  if (!url || !adminKey || !publicKey) return answer(origin, { error: 'Serviço indisponível' }, 503);

  try {
    const admin = createClient(url, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: account, error: lookupError } = await admin
      .from('album_profile_logins').select('email').eq('alias', alias).maybeSingle();
    if (lookupError) return answer(origin, { error: 'Serviço indisponível' }, 503);
    if (!account?.email) return answer(origin, { error: 'Usuário ou senha inválidos, ou perfil ainda não ativado' }, 401);

    // Delegates password checking, token issuance and brute-force controls to Supabase Auth.
    const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email: account.email, password });
    if (error || !data.session) {
      return answer(origin, { error: 'Usuário ou senha inválidos' }, 401);
    }
    return answer(origin, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch {
    return answer(origin, { error: 'Não foi possível autenticar. Tente novamente.' }, 503);
  }
});
