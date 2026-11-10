import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portal = readFileSync(new URL('../src/cloud/AccessPortal.tsx', import.meta.url), 'utf8');
const cloud = readFileSync(new URL('../src/cloud/CloudApp.tsx', import.meta.url), 'utf8');
const cover = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/001_album_privado.sql', import.meta.url), 'utf8');

test('login exclusivamente com usuario e senha, sem cadastro ou aprovacao', () => {
  assert.match(portal, /export function AccessGate/);
  assert.match(portal, /album-alias-login/);
  assert.match(portal, /auth\.setSession/);
  assert.doesNotMatch(portal, /PendingAccess|ApprovalBell|album_access_requests|review_album_request/);
  assert.doesNotMatch(portal, /Primeiro acesso|signUp|Solicitar acesso|auth\.signInWithOtp/);
});

test('nenhuma consulta a pedidos de acesso antigos no aplicativo', () => {
  assert.doesNotMatch(cloud + portal, /album_access_requests|review_album_request|album-pedidos-aprovacao/);
  assert.doesNotMatch(cloud + portal, /<ApprovalBell|<PendingAccess/);
});

test('livro aberto nao exibe barra Nosso album, sino ou botao Sair', () => {
  const start = cloud.lastIndexOf('  return <>');
  assert.ok(start >= 0, 'book view exists');
  const view = cloud.slice(start);
  assert.match(view, /<Album controlledSheets=/);
  assert.doesNotMatch(view, /Nosso álbum|ApprovalBell|signOut\(|>Sair<|🔔/);
});

test('RLS de paginas e bucket de fotos privados permanecem protegidos', () => {
  assert.match(sql, /alter table public\.album_pages enable row level security/);
  assert.match(sql, /for select to authenticated using \(public\.is_couple_member\(\)\)/);
  assert.match(sql, /album-private/);
});

test('capa permanece personalizada', () => {
  assert.match(cover, /Rayssa & Marcos Paulo/);
  assert.match(cover, /R & M/);
});
