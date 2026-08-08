# Setup de infraestrutura — Supabase + Cloudflare R2

Passos que só o Felipe consegue fazer (são contas pessoais). Depois de feitos,
as chaves geradas entram num arquivo `.env`/config que o Claude Code vai usar
pra conectar o app de verdade.

## 1. Supabase (auth + banco de dados + tempo real)

1. Criar conta grátis em https://supabase.com
2. Criar um novo projeto (escolher região mais próxima — ex: São Paulo/`sa-east-1`
   se disponível).
3. Guardar em local seguro:
   - `Project URL` (ex: `https://xxxxx.supabase.co`)
   - `anon public key` (pode ficar exposta no front-end, é a chave pública)
   - `service_role key` (**NUNCA** vai pro front-end — só usada em Edge Functions/servidor)
4. Em **Authentication → Providers**, deixar habilitado "Email" (email + senha).
   Configurar confirmação de e-mail conforme preferir (recomendado manter ativado
   pra validar e-mails de verdade).
5. Rodar o script `schema.sql` (nesta mesma pasta) no **SQL Editor** do Supabase.
   Ele cria as tabelas com `UNIQUE` em `username` e usa o `auth.users` nativo do
   Supabase pra e-mail (que já garante unicidade de e-mail de fábrica — não
   precisa reinventar isso).
6. Ativar **Row Level Security (RLS)** nas tabelas (o script já inclui as policies
   básicas: cada usuário só edita os próprios dados, mas todo mundo autenticado
   pode ler dados marcados como públicos, como ranking e feed).
7. Em **Realtime**, habilitar replication nas tabelas que precisam atualizar ao
   vivo (`batalha_status`, `feed_posts`, `feed_likes`, `feed_comments`).

## 2. Cloudflare R2 (armazenamento de mídia)

1. Criar conta grátis em https://dash.cloudflare.com
2. Ir em **R2** → criar um bucket (ex: `disciplina-media`).
3. Em **R2 → Manage API Tokens**, criar um token com permissão de
   leitura/escrita **apenas nesse bucket** (não usar token de conta inteira).
   Guardar `Access Key ID` e `Secret Access Key` — essas duas **nunca** vão pro
   app do celular, só pra function servidora (ver item 3).
4. Ativar acesso público de leitura no bucket (ou configurar um domínio custom
   tipo `media.seudominio.com`) pra servir as URLs das fotos/vídeos direto.

## 3. Função servidora pra gerar URL assinada de upload

Upload direto do celular pro R2 exige uma URL assinada (senão a chave secreta
teria que ir pro app, o que é inseguro). Duas opções, ambas grátis:

- **Cloudflare Worker** (recomendado, já que o bucket é no Cloudflare): um script
  pequeno que recebe um pedido do app, gera uma URL assinada válida por alguns
  minutos usando a Secret Key (que fica só no Worker), e devolve essa URL pro
  app fazer o upload direto.
- **Supabase Edge Function**: mesma lógica, mas rodando do lado do Supabase (Deno).

Recomendação: usar Cloudflare Worker, porque mantém tudo relacionado a mídia
dentro do mesmo ecossistema do R2. O Claude Code pode escrever esse Worker
quando o Felipe tiver as chaves do passo 2 em mãos.

## 4. Hospedagem do app (pra PWA funcionar de verdade)

- **Cloudflare Pages** é a recomendação natural (grátis, mesmo painel do R2 e do
  Worker). Deploy direto de um repositório Git.
- Alternativas: Vercel, Netlify — qualquer host estático com HTTPS funciona pro
  `manifest.json` + `service-worker.js`.

## Ordem sugerida de execução

1. Criar projeto Supabase → rodar `schema.sql` → testar cadastro/login básico.
2. Criar bucket R2 → gerar chaves.
3. Escrever o Worker de upload assinado.
4. Trocar a camada de dados do app (hoje em `window.storage`) pelo client do
   Supabase — o app já foi pensado com essa troca em mente (ver
   `03-DECISOES-TECNICAS.md`, seção "camada de dados isolada").
5. Subir num domínio real (Cloudflare Pages) e testar instalação do PWA de
   verdade num celular.
