# Álbum de Memórias — Rayssa & Marcos Paulo 💞

Livro de memórias 3D independente para **Rayssa & Marcos Paulo**, com monograma **R & M**, fotos privadas, texto sincronizado e aprovação de novos participantes pelo sino.

**Este repositório é independente da Central de Trabalhadores IA.**

## Executar localmente

Node.js 22+ recomendado.

```bash
npm install
npm test
npm run build
npm run dev
```

Copie `.env.example` para `.env.local` se quiser conectar o banco no modo de desenvolvimento; use somente as variáveis públicas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Não coloque chaves `sb_secret_`, `service_role` nem senhas de banco no GitHub.

## Publicar gratuitamente (GitHub Pages)

1. No repositório, acesse [Settings → Pages](https://github.com/marcos-pds/album-fotos/settings/pages).
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. O fluxo [deploy-pages.yml](.github/workflows/deploy-pages.yml) será executado em alterações na `main`. Caso seja necessário, execute manualmente pela aba Actions.
4. Depois de um deploy bem-sucedido, o endereço será **https://marcos-pds.github.io/album-fotos/**.

**Importante:** o endereço acima só deve ser compartilhado como funcional depois de verificar que a publicação passou.

## Configurar a autenticação

O banco existente do Supabase, projeto `album-de-memorias`, já está configurado com tabelas privadas, bucket `album-private`, RLS e sistema de aprovação por solicitação. **Não crie outro projeto Supabase.**

Abra [Supabase → Authentication → URL Configuration](https://supabase.com/dashboard/project/htrtfbsxrekutngqdawn/auth/url-configuration):

- Configure **Site URL**: `https://marcos-pds.github.io/album-fotos/`.
- Acrescente em **Redirect URLs**: `https://marcos-pds.github.io/album-fotos/`.
- Mantenha `http://127.0.0.1:5173/` se desejar testar localmente.
- Em Authentication → Providers → Email, mantenha a confirmação de e-mail habilitada.

O arquivo `.env.pages` contém **somente** URL e chave publicável, destinada ao navegador; segurança real depende das políticas RLS e Storage do Supabase.

## Cadastro com aprovação

- No primeiro acesso, cada pessoa escolhe o apelido, cria uma conta com e-mail verificável e senha, e confirma o endereço. No login normal, não há campo de e-mail.
- Ela clica em **Solicitar acesso ao álbum**.
- Marcos recebe a solicitação no **sino** do álbum e pode **Aprovar** ou **Recusar**.
- Apenas após aprovação a conta tem permissão de visualizar, adicionar e editar as fotos e os textos.
- A lista de usuários autorizados não fica publicada no GitHub; permanece no banco.

## Proteção das fotografias

Fotos não são hospedadas pelo GitHub: elas ficam em bucket privado no Supabase. Somente usuários autenticados e aprovados podem obter URLs assinadas temporárias. URLs assinadas devem ser mantidas privadas.

O Supabase Free possui cotas e pode pausar por inatividade. Guarde backups de suas memórias.

## Verificações

`npm test` verifica modelo de folhas e contratos de segurança. `npm run build` compila TypeScript e Vite. O GitHub Actions executa testes e publica o site, após habilitar Pages.

Os **testes ponta a ponta** com dois e-mails reais ainda precisam ser realizados: criar conta, aprovar, carregar foto, atualizar nos dois dispositivos, recarregar e verificar privacidade no celular.

## Migração

Migrado do diretório `examples/album-de-memorias-3d/` no repositório da Central de Trabalhadores IA. O código original só deve ser removido após validar esta cópia independente e o site público.

## Perfis do casal e usuário lembrado

A tela de entrada oferece os perfis **Rayssa.Lima** e **Marcos.Paulo**. São apelidos visuais, não substitutos do Supabase Auth: para criar conta é necessário um **e-mail válido** e confirmar esse e-mail.

A opção **Lembrar meu usuário neste dispositivo** salva apenas o apelido e e-mail no localStorage, nunca a senha. A sessão autenticada é persistida pelo Supabase e normalmente continua ativa até sair ou ser invalidada; limpar os dados do navegador encerra essa continuidade.

Nunca coloque senhas reais no GitHub, no código do frontend nem nos arquivos de configuração. Para contas reais prefira senhas fortes e distintas. O acesso às fotografias exige autenticação e aprovação do proprietário.

## Login apenas com perfil e senha

O fluxo de entrada é: **selecionar Rayssa.Lima ou Marcos.Paulo → digitar a senha → entrar**.
O campo de e-mail **não aparece na tela normal de login**.

O botão **Primeiro acesso** oferece um cadastro inicial separado (e-mail verificado é obrigatório no Supabase Auth).
O proprietário cadastra a conta usando o e-mail já permitido na allowlist; depois da confirmação e primeiro acesso autenticado, a conta é vinculada automaticamente a **Marcos.Paulo**. A pessoa parceira primeiro solicita acesso; após a aprovação pelo sino, o perfil **Rayssa.Lima** é vinculado.

O mapeamento apelido → conta/e-mail fica protegido em `public.album_profile_logins` com **RLS sem acesso público**.
A Edge Function `album-alias-login` consulta o mapeamento somente no servidor, verifica a senha pelo Supabase Auth e devolve apenas a sessão. O frontend não contém e-mails pessoais ou senhas.

A opção **Lembrar meu perfil** salva somente o apelido no navegador; não grava e-mail nem senha. O Supabase mantém a sessão automaticamente até que seja encerrada ou revogada.
A migration `supabase/003_private_profile_login.sql` e a função `supabase/functions/album-alias-login/` foram instaladas no projeto Supabase existente.

**Nota:** a versão do código não cria usuários reais. Para ativar os dois perfis é necessário cadastrar e confirmar cada conta individualmente no primeiro acesso. Não use senhas compartilhadas ou curtas para fotos pessoais.
