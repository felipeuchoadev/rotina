# Decisões técnicas e trechos de referência

## Camada de dados isolada (importante pra migração pro Supabase não virar reescrita total)

A v2 chama `window.storage.get/set/delete` (personal + shared) espalhado direto
pelas funções de render. Antes de continuar em Claude Code, vale a pena isolar
isso atrás de uma interface fixa, tipo:

```js
// data-layer.js
export const DataLayer = {
  async getPerfil(userId) { ... },
  async salvarPerfil(userId, dados) { ... },
  async getTreinoTemplate(userId) { ... },
  async salvarExecucaoTreino(userId, data, payload) { ... },
  // etc.
};
```

Hoje essa interface é implementada com `window.storage`. Depois, troca-se só a
implementação interna por chamadas ao `supabase-js`, sem mudar o resto do app
que só conhece `DataLayer`. Isso é o ganho principal de organizar assim desde já.

## Hash de senha (enquanto não há Supabase Auth)

O Felipe mandou um exemplo bom de PBKDF2 + salt. Referência de implementação
(mais robusta que o SHA-256 simples usado na v2):

```js
async function hashPassword(password, existingSaltHex = null) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const salt = existingSaltHex
    ? hexToBuffer(existingSaltHex)
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw', passwordBuffer, 'PBKDF2', false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { hashHex: bufferToHex(derivedBits), saltHex: bufferToHex(salt) };
}
```

**Importante**: isso é um paliativo. Assim que o Supabase Auth entrar em cena,
o ideal é usar `supabase.auth.signUp({ email, password })` e deixar o Supabase
cuidar do hashing/segurança de senha (é o padrão de mercado e evita reinventar
segurança crítica à mão).

## Unicidade de username sem backend (solução usada na v2, válida até migrar)

Usar uma chave compartilhada como "cartório" de usuários:

```js
// registro
const registry = (await sGet('directory:usuarios', true)) || {};
if (registry[usuario]) { /* já existe, bloquear */ }
registry[usuario] = true;
await sSet('directory:usuarios', registry, true);
```

Isso já dá unicidade real entre qualquer pessoa usando o app (porque a chave
`shared:true` é visível pra todo mundo), mesmo sem servidor próprio. Vale manter
esse padrão até a migração — ele resolve o pedido de "sem nome duplicado" de
verdade, não é feitiço.

## Cronômetro — causa raiz do bug relatado e correção recomendada

Ver detalhe em `02-PENDENCIAS-PROXIMA-SESSAO.md`, seção "Testes/qualidade".
Resumo técnico: o cronômetro estava dentro do sistema de *sheet* genérico
(`innerHTML` recriado a cada abertura). Recomendação: view full-screen dedicada,
com estado (`timerSession = { status, startedAt, elapsedMs, pausedMs }`)
resetado explicitamente, e os `addEventListener` dos botões (iniciar/pausar/
finalizar) anexados **uma única vez** na inicialização do app (não a cada
abertura da tela).

## Compressão de mídia no cliente

Padrão recomendado antes de qualquer upload (R2 ou não):

- **Foto**: redimensionar via `<canvas>` (já existe uma função `resizeImage()`
  na v2, reaproveitar) e exportar como JPEG com qualidade ~0.8.
- **Vídeo**: mais delicado — não dá pra recodificar vídeo pesado só com Canvas.
  Opções realistas no navegador:
  - Limitar duração/resolução direto na captura (`<input type="file" accept="video/*" capture="environment">`
    já limita a maioria dos celulares a gravar em resolução razoável).
  - Bibliotecas como `ffmpeg.wasm` permitem recomprimir vídeo no navegador, mas
    são pesadas (alguns MB de WASM) e podem travar em aparelhos mais fracos —
    avaliar com calma se vale a pena ou se a compressão nativa da câmera já é
    suficiente pro caso de uso.

## Sistema de temas (v3 — 20 variações)

Gerar os temas como uma lista de objetos (não precisa de 20 blocos de CSS
manuais): cada tema define `bg`, `bg2` (pra gradiente), `accent`, `accent2`,
`text`. O fundo do app usa
`background: linear-gradient(160deg, var(--bg), var(--bg2))` fixo no `<body>`,
então trocar de tema já muda o fundo inteiro, não só ícones/acentos — que era
a reclamação do Felipe.

## Notificação "modo try hard"

Web `Notification` API só dispara com o app aberto (aba viva). Pra insistir
repetidamente: um `setInterval` curto (ex: a cada 3–5 min) checando itens
pendentes cujo horário já passou, disparando notificação de novo enquanto não
forem concluídos. Deixar claro na interface que isso não funciona com o app
fechado — só Web Push real (com backend) resolveria esse caso, e fica pra uma
fase futura se o Felipe quiser.
