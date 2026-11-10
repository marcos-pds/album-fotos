import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

// Exactly two aliases. PIN hashes and Supabase admin credentials live server-side.
// The frontend never receives email mappings, hashes or admin credentials.
const ORIGINS = new Set([
  'https://marcos-pds.github.io',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
]);
const ALIASES = new Set(['Rayssa.Lima', 'Marcos.Paulo']);

function response(origin: string, data: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
      'Vary': 'Origin',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

function keyFromEnv(name: string, fallback: string): string {
  try {
    const values = JSON.parse(Deno.env.get(name) ?? '{}') as Record<string, string>;
    if (values.default) return values.default;
  } catch { /* use legacy environment variable */ }
  return Deno.env.get(fallback) ?? '';
}

async function sourceHash(request: Request): Promise<string> {
  // Privacy-preserving throttle key. IP values are not stored in plaintext.
  const ip = request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const agent = request.headers.get('user-agent')?.slice(0, 160) ?? '';
  const buffer = new TextEncoder().encode(ip + ':' + agent);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin') ?? '';
  if (!ORIGINS.has(origin)) return new Response('Origem não permitida', { status: 403 });
  if (request.method === 'OPTIONS') return response(origin, null, 204);
  if (request.method !== 'POST') return response(origin, { error: 'Método inválido' }, 405);

  let alias: unknown;
  let password: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 512) return response(origin, { error: 'Login inválido' }, 401);
    const payload = JSON.parse(raw);
    alias = payload?.alias;
    password = payload?.password;
  } catch { return response(origin, { error: 'Login inválido' }, 401); }
  if (typeof alias !== 'string' || !ALIASES.has(alias) ||
      typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return response(origin, { error: 'Usuário ou senha incorretos' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const secret = keyFromEnv('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
  const publishable = keyFromEnv('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
  if (!url || !secret || !publishable) return response(origin, { error: 'Login temporariamente indisponível' }, 503);

  try {
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const fingerprint = await sourceHash(request);
    const { data: pinAccepted, error: pinError } = await admin.rpc('album_verify_fixed_login', {
      p_alias: alias,
      p_password: password,
      p_source_key: fingerprint,
    });
    if (pinError) return response(origin, { error: 'Login temporariamente indisponível' }, 503);
    if (pinAccepted !== true) return response(origin, { error: 'Usuário ou senha incorretos, ou acesso temporariamente bloqueado' }, 401);

    // Existing owner remains the same verified, authorized Supabase Auth user.
    // The partner's synthetic identity is created only after the correct PIN.
    const { data: existing, error: lookupError } = await admin
      .from('album_profile_logins')
      .select('user_id,email')
      .eq('alias', alias)
      .maybeSingle();
    if (lookupError) return response(origin, { error: 'Login temporariamente indisponível' }, 503);

    let email: string;
    if (existing) {
      email = existing.email;
    } else if (alias === 'Rayssa.Lima') {
      // Unique, non-deliverable internal identity; no actual email is requested.
      email = 'rm-' + crypto.randomUUID().replaceAll('-', '') + '@album-fotos.example';
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: 'Rayssa Lima' },
      });
      if (createError || !created.user) return response(origin, { error: 'Não foi possível preparar o perfil' }, 503);

      const { data: linked, error: linkError } = await admin.rpc('album_register_fixed_profile', {
        p_alias: alias,
        p_user_id: created.user.id,
        p_email: email,
      });
      if (linkError || linked !== true) {
        await admin.auth.admin.deleteUser(created.user.id);
        return response(origin, { error: 'Não foi possível preparar o perfil' }, 503);
      }
    } else {
      // Owner already has a verified Supabase account. Never generate a second owner.
      return response(origin, { error: 'Perfil do proprietário indisponível' }, 503);
    }

    const client = createClient(url, publishable, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Existing owner may still have an older password. Update only after the
    // hashed, rate-limited PIN check has succeeded on the server.
    let signed = await client.auth.signInWithPassword({ email, password });
    if ((signed.error || !signed.data.session) && existing) {
      const { error: resetError } = await admin.auth.admin.updateUserById(existing.user_id, { password });
      if (resetError) return response(origin, { error: 'Não foi possível validar o perfil' }, 503);
      signed = await client.auth.signInWithPassword({ email, password });
    }
    if (signed.error || !signed.data.session) {
      return response(origin, { error: 'Usuário ou senha incorretos' }, 401);
    }
    return response(origin, {
      access_token: signed.data.session.access_token,
      refresh_token: signed.data.session.refresh_token,
    });
  } catch {
    return response(origin, { error: 'Falha temporária ao entrar' }, 503);
  }
});
