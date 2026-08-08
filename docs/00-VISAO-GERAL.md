# DISCIPLINA — App de Rotina, Treinos e Estudos (foco ESA)

Dono do projeto: Felipe Sousa Uchoa ("Flip") — estudante de Engenharia de Software
(UniAteneu), co-fundador da RED Systems Corporation, se preparando para o concurso
da ESA (Escola de Sargentos das Armas) — objetivo: 3º Sargento, Infantaria.

Este documento existe pra dar contexto completo a quem (ou qual IA) continuar o
projeto a partir daqui, sem precisar reconstruir o histórico de decisões.

## O que é o app

Um aplicativo de disciplina pessoal com tema 100% Exército Brasileiro / ESA:

- **Treinos** — plano de treino físico (corrida, preparação pro TAF), com semanas
  que só liberam por tempo real, comprovação obrigatória por foto/vídeo tirado na
  hora, cronômetro de sessão.
- **Estudos** — banco de matérias com conteúdos programáticos, checklist de
  progresso, cronômetro de sessão em tela cheia, simulados com registro de
  acertos/erros.
- **Alimentação** — controle de refeições da semana, meta de água calculada por
  idade/peso/altura, evolução de peso, análise (heurística, não IA de verdade —
  ver seção de pendências).
- **Rotina** — hábitos diários com horário (banho, escovar dente etc.) e alarme/
  notificação.
- **Batalha** — ranking de disciplina entre amigos, com sistema de patente militar
  (Recruta → Soldado → Cabo → 3º Sargento) baseado em XP, feed social estilo
  Strava (postar foto + legenda, curtir, comentar).
- **Perfil** — dados pessoais, configurações, temas visuais, modo de edição.

## Por que "3º Sargento" é o teto do sistema de patente

O Felipe está estudando pra ESA, que forma sargentos. A patente máxima do app é
justamente 3º Sargento — não é arbitrário, é o espelho do objetivo real dele.
Pediu explicitamente que seja **muito difícil de manter**: qualquer falha "esculacha"
e derruba XP/patente. Isso é intencional — é pra doer.

## Estado atual do projeto

Existe **uma versão funcional (v2)** rodando 100% no navegador, sem backend real,
usando o sistema de `window.storage` do Claude.ai (chave-valor pessoal + compartilhado).
Ela está em `app/disciplina-v2-current.html`.

**Essa v2 não incorpora ainda a lista enorme de correções e reformulações que o
Felipe pediu na última rodada de feedback** (ver `02-PENDENCIAS-PROXIMA-SESSAO.md`).
Ou seja: o que está no zip é o ponto de partida, não o produto final. A próxima
sessão (agora em Claude Code) deveria começar lendo esse documento de pendências
antes de tocar em qualquer linha de código.

## Arquitetura alvo (ainda não implementada)

```
┌─────────────────────┐
│   App (PWA)          │  HTML/JS local no celular/PC, instalável sem loja de apps
└──────────┬───────────┘
           │
   ┌───────┴────────┐
   │                 │
┌──▼────────┐   ┌────▼─────────────┐
│ Supabase   │   │ Cloudflare R2     │
│ (Auth,     │   │ (fotos e vídeos   │
│ Postgres,  │   │ comprimidos no    │
│ Realtime)  │   │ cliente antes do  │
└────────────┘   │ upload)           │
                  └───────────────────┘
```

- **Supabase**: autenticação real (e-mail + senha), banco Postgres com dados de
  texto/estado, sincronização em tempo real entre dispositivos.
- **Cloudflare R2**: armazenamento de mídia pesada (fotos de comprovação, vídeos,
  posts do feed). Motivo: 10GB grátis + **tráfego de saída ilimitado e grátis**
  (diferente de S3), o que é decisivo pra um app com muita foto/vídeo rodando de
  graça por longo prazo.
- Upload de mídia: **nunca enviar arquivo bruto**. Comprimir no navegador
  (canvas pra imagem, `MediaRecorder`/transcodificação leve pra vídeo) antes do
  upload. R2 exige uma função servidora leve (Cloudflare Worker, grátis) pra gerar
  URLs assinadas de upload, porque a chave secreta do R2 nunca pode ficar no
  cliente.
- PWA real: `manifest.json` + `service-worker.js` com `skipWaiting`/`clients.claim`
  pra autoupdate, e captura do evento `beforeinstallprompt` pra botão de instalar
  sem loja de apps. **Isso só funciona de verdade servido de um domínio real
  (https)** — não dá pra testar instalação/autoupdate dentro do preview de artifact
  do Claude.ai. Cloudflare Pages é uma opção natural pra hospedar (grátis, já
  integrado ao ecossistema Cloudflare que ele vai usar pro R2).

Nenhum desses três pilares (Supabase, R2, hospedagem real) foi configurado ainda —
são passos que só o Felipe pode fazer (são contas dele). O `01-SETUP-SUPABASE-R2.md`
tem o roteiro exato.

## Stack e convenções usadas até agora

- Front-end: HTML + CSS + JS puro (sem framework), pensado pra virar um PWA depois.
- Fontes: Oswald (títulos/display) — Felipe rejeitou "Black Ops One" por ser
  "quadrada" demais; prefere Oswald. JetBrains Mono pra números/cronômetro/HUD.
- Cor padrão: tema "RED" (vermelho/preto/branco), inspirado na identidade visual
  da RED Systems Corporation (marca do próprio Felipe). Texto deve ser branco puro
  ("brancão"), não cinza-claro.
- Tom de voz do app: militar, duro, sem paparico. Mensagens de "pressão psicológica"
  (não confundir com assédio real — são frases de efeito estilo instrutor de
  quartel, não xingamento pessoal degradante).
- Sem localStorage/sessionStorage (não funciona em artifacts) — tudo via
  `window.storage` (chave pessoal por usuário + chave `shared:true` pra dados
  visíveis entre usuários, como ranking e feed).

## Limitação importante sobre "IA de verdade" na Alimentação

O Felipe pediu uma análise "tipo uma IA" dando dicas sobre a alimentação. O que
existe hoje (e o que dá pra fazer sem custo/backend) é uma análise **baseada em
regras** (heurística: se comeu X vezes fast-food, se bateu meta de água, etc.),
não uma IA generativa de verdade. Pra virar IA de verdade precisa chamar uma API
de LLM (ex: API da Anthropic) a partir de um backend — o que é perfeitamente
possível na arquitetura Supabase (via Edge Function), mas é canal separado de
custo (a API cobra por uso) e depende de uma chave de API que só o Felipe pode
gerar. Vale alinhar expectativa sobre isso antes de prometer "IA real" no app.
