import test from 'node:test';
import assert from 'node:assert/strict';
import { readRememberedAccounts, writeRememberedAccount, REMEMBERED_ACCOUNTS_KEY, PROFILE_OPTIONS } from '../src/cloud/rememberedAccounts.ts';
import { readFileSync } from 'node:fs';

function memoryStorage() {
  const entries = new Map();
  return {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value); },
    removeItem: key => { entries.delete(key); },
    dump: () => entries.get(REMEMBERED_ACCOUNTS_KEY) || ''
  };
}
test('dois perfis ficam disponíveis sem credenciais hardcoded', () => {
  assert.deepEqual([...PROFILE_OPTIONS], ['Rayssa.Lima', 'Marcos.Paulo']);
});
test('lembra e-mails por perfil, sem persistir senhas', () => {
  const store = memoryStorage();
  writeRememberedAccount(store, 'Rayssa.Lima', 'ray@exemplo.com', true);
  writeRememberedAccount(store, 'Marcos.Paulo', 'marcos@exemplo.com', true);
  const saved = readRememberedAccounts(store);
  assert.equal(saved.lastProfile, 'Marcos.Paulo');
  assert.equal(saved.emails['Rayssa.Lima'], 'ray@exemplo.com');
  assert.equal(saved.emails['Marcos.Paulo'], 'marcos@exemplo.com');
  assert.equal(store.dump().includes('password'), false);
  assert.equal(store.dump().includes('senha'), false);
});
test('desmarcar lembrar usuário remove seu e-mail salvo', () => {
  const store = memoryStorage();
  writeRememberedAccount(store, 'Rayssa.Lima', 'ray@exemplo.com', true);
  writeRememberedAccount(store, 'Rayssa.Lima', 'ray@exemplo.com', false);
  assert.equal(readRememberedAccounts(store).emails['Rayssa.Lima'], undefined);
  assert.equal(store.dump(), '');
});
test('armazenamento malformado não impede login', () => {
  const store = memoryStorage();
  store.setItem(REMEMBERED_ACCOUNTS_KEY, '{invalid');
  assert.deepEqual(readRememberedAccounts(store), {lastProfile: '', emails: {}});
});
test('interface requer e-mail para criar conta e Supabase persiste a sessão', () => {
  const ui = readFileSync(new URL('../src/cloud/AccessPortal.tsx', import.meta.url), 'utf8');
  const cloud = readFileSync(new URL('../src/cloud/supabase.ts', import.meta.url), 'utf8');
  assert.match(ui, /auth\.signUp/);
  assert.match(ui, /signInWithPassword/);
  assert.match(ui, /Lembrar meu usuário neste dispositivo/);
  assert.match(cloud, /persistSession: true/);
  assert.doesNotMatch(ui, /localStorage\.setItem\([^)]*password/i);
});
