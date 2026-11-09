# Álbum de Memórias — R & M

Livro de memórias interativo de **Rayssa & Marcos Paulo**.

Aplicação independente da Central de Trabalhadores IA. Código React/TypeScript + Vite + Supabase para fotos privadas, textos sincronizados e pedidos de acesso aprovados pelo proprietário.

> O código do site é público; as fotos permanecem em armazenamento privado do Supabase com autenticação e RLS.

## Executar

```bash
npm install
npm test
npm run build
npm run dev
```

## Publicação

Configurar GitHub Pages em **Settings → Pages → Source: GitHub Actions**.

URL após a publicação bem-sucedida: https://marcos-pds.github.io/album-fotos/

**Supabase → Authentication → URL Configuration:** configurar a mesma URL como Site URL e adicionar em Redirect URLs. Manter confirmação de e-mail ativada.

O banco já foi configurado no projeto Supabase existente `album-de-memorias`. Não é necessário criar outro projeto nem divulgar senhas.

O usuário convidado pode criar conta e solicitar autorização pelo site. Somente o proprietário pode aprovar pelo sino, e apenas usuários autorizados têm acesso às memórias.
