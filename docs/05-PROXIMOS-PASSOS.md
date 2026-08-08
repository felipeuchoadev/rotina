# Próximos passos — v3 já entregue, o que falta

A v3 (`app/disciplina-v3.html`) roda **standalone** em qualquer navegador. Tudo
o que dá pra fazer sem contas externas já está funcionando e testado. O que
falta depende de coisas que **só o Felipe pode criar** (são contas dele).

## Como rodar/testar agora

- Abrir `app/disciplina-v3.html` direto no navegador **funciona**, mas o ideal
  (pra service worker/PWA e evitar limitações de `file://`) é servir por HTTP.
- Já existe um servidor local pronto: `.claude/serve.ps1` (PowerShell, sem
  dependência). No Claude Code, o preview sobe sozinho em `http://localhost:8123`.
- Os dados ficam em `localStorage` do navegador — cada navegador/dispositivo é
  isolado (sincronizar entre aparelhos = fase Supabase abaixo).

## 1. PWA de verdade (instalar pelo site + autoupdate) — precisa de HOST HTTPS

Os arquivos já existem: `app/manifest.json`, `app/service-worker.js`,
`icon-192.png`, `icon-512.png`. Falta **hospedar num domínio HTTPS** (o botão
"instalar" e o autoupdate só funcionam servidos de https real, não em `file://`
nem no preview local).

- Recomendado: **Cloudflare Pages** (grátis, mesmo ecossistema do R2).
  Deploy da pasta `app/` e pronto.
- Falta ainda adicionar no HTML o **botão "Instalar App"** capturando
  `beforeinstallprompt` (não incluí porque não tem como testar sem host real —
  faço assim que o domínio estiver no ar).

## 2. Supabase — precisa da CONTA do Felipe

Destrava: login na nuvem, dados sincronizando ao vivo entre celular e PC, e
ranking/feed reais entre pessoas diferentes.

- Passos de criação: `docs/01-SETUP-SUPABASE-R2.md` + `docs/schema.sql`.
- No código, a troca é **cirúrgica**: todo acesso a dados passa pelo objeto
  `Store` (no topo do `<script>`). Hoje ele usa `localStorage`; basta trocar a
  implementação interna de `Store.get/set/del` (e o `auth`) por chamadas ao
  `supabase-js`. O resto do app não muda.
- O que preciso do Felipe: `Project URL` + `anon key`.

## 3. Cloudflare R2 — precisa da CONTA do Felipe

Destrava: vídeos/fotos pesados sem estourar o `localStorage` (hoje foto é
comprimida e cabe; vídeo grande só persiste com R2).

- Passos: `docs/01-SETUP-SUPABASE-R2.md` (bucket + token + Worker de URL
  assinada).
- No código, o ponto de troca é a função `renderProvaPicker` / upload de mídia:
  em vez de guardar `dataURL`/`objectURL`, faz upload do blob comprimido pro R2
  e salva só a **URL**.
- O que preciso do Felipe: bucket criado + as chaves do Worker (a Secret Key
  **nunca** vai pro app — fica só no Worker).

## Ordem sugerida

1. Felipe testa a v3 local e manda ajustes de UX/conteúdo.
2. Hospedar no Cloudflare Pages → PWA instalável + botão de instalar.
3. Criar Supabase → migrar `Store` e o auth.
4. Criar R2 + Worker → migrar upload de mídia.

## Notas de honestidade técnica (repetir pro Felipe quando for a hora)

- Notificação "try hard" só dispara com **o app aberto**. App fechado exige Web
  Push + servidor — fase futura.
- "Análise IA" da alimentação é **heurística por regras** hoje. IA generativa
  de verdade = API de LLM chamada por uma Edge Function do Supabase (custo por
  uso, chave do Felipe).
- Insígnias de patente e emblema ESA são **arte SVG original** inspirada no
  padrão militar brasileiro — não reproduzem material oficial protegido.
