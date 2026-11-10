import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PROFILE_OPTIONS, REMEMBERED_PROFILE_KEY,
  readRememberedProfile, writeRememberedProfile,
} from '../src/cloud/rememberedAccounts.ts';

function memoryStorage() {
  const entries = new Map();
  return {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value); },
    removeItem: key => { entries.delete(key); },
    dump: () => JSON.stringify([...entries])
  };
}

test('only two fixed usernames can be selected', () => {
  assert.deepEqual([...PROFILE_OPTIONS], ['Rayssa.Lima', 'Marcos.Paulo']);
});

test('remembers only a selected nickname (not email or password)', () => {
  const storage = memoryStorage();
  writeRememberedProfile(storage, 'Rayssa.Lima', true);
  assert.equal(readRememberedProfile(storage), 'Rayssa.Lima');
  assert.equal(storage.getItem(REMEMBERED_PROFILE_KEY), 'Rayssa.Lima');
  assert.doesNotMatch(storage.dump(), /@|senha|password|refresh_token/);
  writeRememberedProfile(storage, 'Rayssa.Lima', false);
  assert.equal(readRememberedProfile(storage), '');
});

test('legacy remembered email data is discarded when saving', () => {
  const storage = memoryStorage();
  storage.setItem('album-rm:remembered-accounts:v1',
    JSON.stringify({ lastProfile: 'Marcos.Paulo', emails: { 'Marcos.Paulo': 'old@example.com' } }));
  assert.equal(readRememberedProfile(storage), 'Marcos.Paulo');
  writeRememberedProfile(storage, 'Marcos.Paulo', true);
  assert.equal(storage.getItem('album-rm:remembered-accounts:v1'), null);
  assert.doesNotMatch(storage.dump(), /old@example.com/);
});

test('unrecognized storage values do not choose a user', () => {
  const storage = memoryStorage();
  storage.setItem(REMEMBERED_PROFILE_KEY, 'attacker');
  assert.equal(readRememberedProfile(storage), '');
});

test('default login selects only alias and password, with no signup', () => {
  const ui = readFileSync(new URL('../src/cloud/AccessPortal.tsx', import.meta.url), 'utf8');
  const login = ui.slice(ui.indexOf('export function AccessGate('), ui.indexOf('export function PendingAccess('));
  const cloud = readFileSync(new URL('../src/cloud/supabase.ts', import.meta.url), 'utf8');
  assert.match(login, /Quem está entrando\?/);
  assert.match(login, /autoFocus required minLength=\{6\}/);
  assert.match(login, /album-alias-login/);
  assert.match(login, /auth\.setSession/);
  assert.doesNotMatch(login, /Primeiro acesso|auth\.signUp|type="email"|signInWithOtp/);
  assert.match(cloud, /persistSession: true/);
  assert.doesNotMatch(login, /localStorage\.setItem\([^)]*password/i);
});

test('private fixed PIN hashes, rate limits, and server-side provisioning', () => {
  const sql = readFileSync(new URL('../supabase/004_fixed_two_accounts.sql', import.meta.url), 'utf8');
  const edge = readFileSync(new URL('../supabase/functions/album-alias-login/index.ts', import.meta.url), 'utf8');
  assert.match(sql, /album_login_codes enable row level security/);
  assert.match(sql, /revoke all on public\.album_login_codes from public, anon, authenticated/);
  assert.match(sql, /album_login_attempts/);
  assert.match(sql, /extensions\.crypt/);
  assert.match(sql, /grant execute on function public\.album_verify_fixed_login/);
  assert.match(edge, /album_verify_fixed_login/);
  assert.match(edge, /auth\.admin\.createUser/);
  assert.match(edge, /auth\.admin\.updateUserById/);
  assert.match(edge, /auth\.signInWithPassword/);
  assert.match(edge, /Cache-Control': 'no-store/);
  assert.doesNotMatch(sql + edge, /101026/);
});
