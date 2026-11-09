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

test('default login uses profile and password, initial activation is separate', () => {
  const ui = readFileSync(new URL('../src/cloud/AccessPortal.tsx', import.meta.url), 'utf8');
  const cloud = readFileSync(new URL('../src/cloud/supabase.ts', import.meta.url), 'utf8');
  assert.match(ui, /Quem está entrando\?/);
  assert.match(ui, /view === 'signup' && <>/);
  assert.match(ui, /autoFocus required minLength={8}/);
  assert.match(ui, /album-alias-login/);
  assert.match(ui, /auth\.setSession/);
  assert.match(ui, /auth\.signUp/);
  assert.match(cloud, /persistSession: true/);
  assert.doesNotMatch(ui, /localStorage\.setItem\([^)]*password/i);
});

test('private alias mapping enforces role, confirmed email and backend authentication', () => {
  const sql = readFileSync(new URL('../supabase/003_private_profile_login.sql', import.meta.url), 'utf8');
  const edge = readFileSync(new URL('../supabase/functions/album-alias-login/index.ts', import.meta.url), 'utf8');
  assert.match(sql, /album_profile_logins enable row level security/);
  assert.match(sql, /revoke all on public\.album_profile_logins from public, anon, authenticated/);
  assert.match(sql, /email_confirmed_at is not null/);
  assert.match(sql, /when 'owner' then 'Marcos\.Paulo'/);
  assert.match(sql, /when 'partner' then 'Rayssa\.Lima'/);
  assert.match(edge, /admin\s*\.from\('album_profile_logins'\)/);
  assert.match(edge, /auth\.signInWithPassword/);
  assert.match(edge, /Cache-Control': 'no-store/);
  assert.doesNotMatch(edge, /10\.10\.26/);
});
