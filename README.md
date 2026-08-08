# DISCIPLINA — projeto (pacote pra continuar no Claude Code)

Leia nesta ordem:

1. `docs/00-VISAO-GERAL.md` — o que é o app, arquitetura alvo, decisões de
   design já tomadas.
2. `docs/02-PENDENCIAS-PROXIMA-SESSAO.md` — **lista completa e organizada de
   tudo que ainda falta fazer**, direto do último feedback do Felipe. Comece
   por aqui na prática, é o backlog real.
3. `docs/03-DECISOES-TECNICAS.md` — trechos de código de referência (hash de
   senha, unicidade de usuário, correção do bug do cronômetro, compressão de
   mídia, sistema de temas, notificações).
4. `docs/01-SETUP-SUPABASE-R2.md` + `docs/schema.sql` — roteiro e schema pra
   quando o Felipe tiver criado as contas Supabase/Cloudflare e for hora de
   migrar do armazenamento local pro backend real.
5. `docs/04-CHANGELOG.md` — histórico do que já foi construído (v1 → v2).

## Arquivo do app

`app/disciplina-v3.html` — **versão atual (v3), standalone**. Roda em qualquer
navegador/celular usando `localStorage` (camada `Store` isolada, pronta pra
virar Supabase). Cobre o grosso do feedback do Felipe. Ver
`docs/04-CHANGELOG.md` (o que foi feito) e `docs/05-PROXIMOS-PASSOS.md`
(o que falta e depende das contas Supabase/R2/host).

`app/disciplina-v2-current.html` — versão anterior (só rodava dentro do
Claude.ai via `window.storage`). Mantida como referência histórica.

PWA: `app/manifest.json` + `app/service-worker.js` + `icon-192/512.png` já
existem; instalação/autoupdate só valem servido de um host HTTPS real.
Pra testar local: `.claude/serve.ps1` sobe em `http://localhost:8123`.

## Backend (self-hosted em VM Ubuntu)

`server/` — API **Node + Express + Socket.io + PostgreSQL (Prisma)**, decisão do
Felipe por backend próprio numa VM. Cobre auth (e-mail+senha, JWT), perfil,
treinos, estudos, alimentação, rotina, batalha (ranking + feed em tempo real) e
upload de mídia com compressão. Guia de deploy completo em
`docs/08-BACKEND-DEPLOY.md`; infraestrutura da VM em `docs/07-INFRA-VM-UBUNTU.md`.
Falta conectar o frontend (`app/`) à API (trocar a camada `Store`/auth por
`fetch` + Socket.io) — feito quando a VM/URL estiver de pé.

## Contexto rápido do dono do projeto

Felipe Sousa Uchoa, estudante de Engenharia de Software, se preparando pro
concurso da ESA (Escola de Sargentos das Armas — objetivo: 3º Sargento,
Infantaria). O app é pessoal, mas pensado pra outras pessoas usarem também
(por isso login, ranking entre amigos, feed social). Tom de voz do produto:
duro, militar, "sem paparico" — isso é intencional, não suavizar sem que ele peça.
