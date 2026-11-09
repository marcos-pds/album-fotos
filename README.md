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

- Rayssa cria uma conta com nome, e-mail e senha (ou usa um link de acesso), confirmando o endereço de e-mail.
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
