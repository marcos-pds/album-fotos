# Álbum de Memórias 3D — Rayssa & Marcos Paulo 💞

Livro 3D de Rayssa & Marcos Paulo, com fotografias privadas, mensagens e sincronização em tempo real. Repositório independente da Central IA.

## Acesso ao álbum

Site: https://marcos-pds.github.io/album-fotos/

O login mostra exatamente dois perfis: **Rayssa.Lima** e **Marcos.Paulo**. Selecione seu perfil, digite a senha previamente definida e clique em Entrar no álbum. Não existe campo de e-mail nem botão Primeiro acesso.

A senha é conferida no servidor Supabase. Os hashes bcrypt dos dois perfis foram configurados diretamente no banco e não estão neste repositório. O código público não contém a senha em texto claro.

O perfil Marcos.Paulo reutiliza a conta de proprietário já verificada e autorizada no Supabase. A senha definida é aplicada no primeiro login válido. O perfil Rayssa.Lima recebe uma identidade interna criada pelo servidor no primeiro login correto, sem pedir e-mail pessoal ou exigir cadastro.

A sessão é persistida pelo Supabase e pode expirar ou ser revogada. A opção Lembrar meu perfil salva apenas o nome no navegador, nunca a senha.

**Atenção de segurança:** a senha igual de seis dígitos escolhida para os dois perfis é fraca; qualquer pessoa que a descubra poderá acessar as fotos. É recomendável mudar para senhas fortes e distintas. O backend possui limite de tentativas, mas isso não substitui credenciais fortes.

## Executar localmente

Node.js 22+: npm install; npm test; npm run build; npm run dev.

Use .env.example como referência para .env.local, incluindo apenas a URL e a chave publicável do Supabase. Nunca comite service_role, chaves secretas ou senhas.

## Publicação gratuita

O GitHub Actions publica o site a partir do arquivo .github/workflows/deploy-pages.yml.
No GitHub Pages, a origem deve ser GitHub Actions. O endereço público é https://marcos-pds.github.io/album-fotos/.

## Banco e autenticação

O banco do Supabase é o projeto album-de-memorias, já existente. As fotos ficam no bucket privado album-private e as páginas têm RLS.

- supabase/001_album_privado.sql: páginas e armazenamento privado
- supabase/002_acesso_com_aprovacao.sql: legado de solicitações, não apresentado no login
- supabase/003_private_profile_login.sql: associação privada entre nome e usuário
- supabase/004_fixed_two_accounts.sql: hashes protegidos e controle de tentativas (sem a senha)
- supabase/functions/album-alias-login/index.ts: login e criação interna dos dois perfis

A criação do segundo usuário e a definição da senha da conta proprietária acontecem automaticamente no primeiro acesso válido pelo backend; não precisam de uma tela pública de cadastro.

## Testes

npm test valida contratos e segurança. npm run build verifica TypeScript e Vite.

O resultado de compilação não substitui um teste ponta a ponta com ambos os perfis: efetuar primeiro login, enviar foto, sincronizar dois aparelhos, recarregar e verificar privacidade.
