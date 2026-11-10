import { useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { supabase } from './supabase';
import { PROFILE_OPTIONS, readRememberedProfile, writeRememberedProfile, getAvailableStorage } from './rememberedAccounts';

type Notice = (message: string) => void;

const inputStyle: CSSProperties = {
  width: '100%', padding: '13px 15px', border: '1px solid #dcc8b5',
  borderRadius: 12, background: '#fff9f2', color: '#442b30',
  fontSize: 15, outlineColor: '#b48a53', boxSizing: 'border-box'
};
const buttonStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '13px 17px', border: '1px solid #c19b64', borderRadius: 12,
  background: 'linear-gradient(130deg, #7b3540, #54202a)', color: '#fff2d9',
  fontWeight: 600, cursor: 'pointer', fontSize: 14
};
const subtleButton: CSSProperties = {
  ...buttonStyle, background: 'rgba(255,255,255,.08)', borderColor: '#ffffff40',
  color: '#fff3e1'
};

function Layout({ children }: { children: ReactNode }) {
  return <div style={{
    minHeight: '100svh', padding: '36px 18px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'radial-gradient(circle at 50% 15%,#4b333c,#160c15 72%)',
    color: '#fff2e7', fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box'
  }}>
    <div style={{
      width: 'min(440px, 100%)', padding: 'clamp(22px, 5vw, 36px)', borderRadius: 24,
      background: 'linear-gradient(155deg,rgba(255,255,255,.13),rgba(255,255,255,.04))',
      border: '1px solid rgba(241,218,191,.26)', boxShadow: '0 28px 90px #0008',
      backdropFilter: 'blur(18px)'
    }}>{children}</div>
  </div>;
}

const field = (caption: string, control: ReactNode) => <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#ead9d1' }}>{caption}{control}</label>;



export function AccessGate({ onNotice }: { onNotice: Notice }) {
  const [profile, setProfile] = useState(() => readRememberedProfile(getAvailableStorage()));
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  const selectProfile = (alias: string) => {
    setProfile(alias);
    setPassword('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    if (!PROFILE_OPTIONS.some(alias => alias === profile)) {
      onNotice('Selecione Rayssa.Lima ou Marcos.Paulo.');
      return;
    }
    if (password.length < 6) {
      onNotice('Digite a senha deste perfil.');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('album-alias-login', {
        body: { alias: profile, password }
      });
      if (error || !data?.access_token || !data?.refresh_token) {
        throw new Error('Nome ou senha incorretos. Confira os dados e tente novamente.');
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token
      });
      if (sessionError) throw sessionError;
      writeRememberedProfile(getAvailableStorage(), profile, remember);
      setPassword('');
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return <Layout>
    <div style={{ textAlign: 'center', marginBottom: 26 }}>
      <div style={{ fontFamily: 'Georgia,serif', color: '#e6c68d', fontSize: 46, letterSpacing: 7 }}>R &amp; M</div>
      <div style={{ fontFamily: 'Georgia,serif', fontSize: 24, marginTop: 7 }}>Rayssa &amp; Marcos Paulo</div>
      <p style={{ fontSize: 13, color: '#dbc9c6', marginTop: 8 }}>Nosso livro de memórias • um lugar só nosso</p>
    </div>
    <div style={{ display: 'grid', gap: 10, marginBottom: 22 }}>
      <span style={{ fontSize: 13, color: '#ead9d1' }}>Quem está entrando?</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {PROFILE_OPTIONS.map(alias => <button type="button" key={alias}
          onClick={() => selectProfile(alias)} aria-pressed={profile === alias}
          style={{ ...subtleButton, padding: '15px 9px',
            background: profile === alias ? '#f1e5d3' : '#ffffff13',
            color: profile === alias ? '#512a34' : '#fff1e5',
            border: profile === alias ? '1px solid #d5b782' : '1px solid #ffffff30',
            fontSize: 13, borderRadius: 11, transition: 'background .18s ease' }}>
          {alias}
        </button>)}
      </div>
    </div>

    {profile ? <form onSubmit={submit} style={{ display: 'grid', gap: 15 }}>
      <div style={{ fontSize: 13, color: '#e6d1ce' }}>
        Entrando como <strong style={{ color: '#f3d39c' }}>{profile}</strong>
      </div>
      {field('Senha', <input type="password" autoComplete="current-password"
        autoFocus required minLength={6} maxLength={128} value={password}
        onChange={e => setPassword(e.target.value)}
        style={inputStyle} placeholder="Digite sua senha" />)}
      <label style={{ fontSize: 13, color: '#ead9d1', display: 'flex',
        alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)}
          style={{ width: 17, height: 17, accentColor: '#b88453' }} />
        Lembrar meu perfil neste dispositivo
      </label>
      <button disabled={busy} style={{ ...buttonStyle, opacity: busy ? 0.65 : 1 }}>
        {busy ? 'Entrando…' : 'Entrar no álbum'}
      </button>
    </form> :
      <p style={{ color: '#ddc5be', fontSize: 13, textAlign: 'center', lineHeight: 1.7 }}>
        Escolha um dos dois perfis acima para digitar sua senha.
      </p>}

    <p style={{ color: '#ccb9bc', fontSize: 12, lineHeight: 1.6,
      marginTop: 24, textAlign: 'center' }}>
      A sessão fica conectada neste dispositivo até você sair ou ela ser invalidada.
    </p>
  </Layout>;
}
