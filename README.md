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

`app/disciplina-v2-current.html` — versão atual, funcional, rodando sem
backend (usa `window.storage` do Claude.ai, então **só funciona dentro do
Claude.ai**, não é ainda um HTML standalone pra hospedar em qualquer lugar).
Isso é importante: ao continuar no Claude Code, uma das primeiras decisões é
se vale reescrever a camada de armazenamento pra algo que funcione fora do
Claude.ai desde já (localStorage temporário, por exemplo) enquanto o Supabase
não está plugado, ou se pula direto pra integração com Supabase.

## Contexto rápido do dono do projeto

Felipe Sousa Uchoa, estudante de Engenharia de Software, se preparando pro
concurso da ESA (Escola de Sargentos das Armas — objetivo: 3º Sargento,
Infantaria). O app é pessoal, mas pensado pra outras pessoas usarem também
(por isso login, ranking entre amigos, feed social). Tom de voz do produto:
duro, militar, "sem paparico" — isso é intencional, não suavizar sem que ele peça.
