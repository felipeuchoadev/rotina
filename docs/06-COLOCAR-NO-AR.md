# Colocar o DISCIPLINA no ar — 100% de graça

Lista prática do que o Felipe precisa. Ordenado por prioridade: a **Fase 1**
já entrega o app no ar, com link público e instalável no celular. As fases 2 e
3 são pra login na nuvem e mídia pesada.

Legenda: 🟢 grátis sem cartão · 🟡 grátis mas pede cartão pra ativar (não cobra
dentro do limite) · ⚙️ eu faço no código depois que você me passar as chaves.

---

## Fase 1 — App no ar + instalável (o mínimo)

Só isso já te dá: link público (https), PWA instalável no celular sem loja,
autoupdate. Os dados ainda ficam no aparelho (localStorage) — cada
celular/PC separado. Serve pra usar sozinho e testar de verdade no celular.

**Você precisa:**
- [ ] 🟢 **Conta Cloudflare** — https://dash.cloudflare.com/sign-up (e-mail + senha, sem cartão).

**Como publicar (rota mais simples, sem GitHub):**
1. No painel Cloudflare → **Workers & Pages** → **Create** → **Pages** →
   **Upload assets** (Direct Upload).
2. Dá um nome (ex: `disciplina`) e **arrasta a pasta `app/`** inteira
   (com `disciplina-v3.html`, `manifest.json`, `service-worker.js`,
   `icon-192.png`, `icon-512.png`).
3. Publica. Sai um link tipo `https://disciplina.pages.dev`.
4. Acessa `https://disciplina.pages.dev/disciplina-v3.html` no celular →
   menu do navegador → **Instalar app / Adicionar à tela inicial**.

> Falta eu adicionar no código o **botão "Instalar App"** (evento
> `beforeinstallprompt`) — faço assim que o site estiver no `.pages.dev`, porque
> só dá pra testar isso servido de https real.

**Opcional (autoupdate automático a cada mudança):**
- [ ] 🟢 **Conta GitHub** — https://github.com/signup (sem cartão).
- Subo o projeto no GitHub e conecto no Cloudflare Pages (Git). Aí toda vez que
  eu mudar o código e der push, o app atualiza sozinho no ar. (Sem isso, você
  re-arrasta a pasta quando tiver versão nova — funciona igual, só é manual.)

**Domínio próprio (ex: `disciplina.app`)** — ❌ isso **custa** (domínio é pago,
~R$40–60/ano). Não precisa: o `.pages.dev` é grátis, com https, e funciona pra
PWA. Fica pra quando/se você quiser um nome bonito.

---

## Fase 2 — Login na nuvem + tempo real + multi-dispositivo (Supabase)

Destrava: mesma conta no celular e no PC, ranking/feed reais entre pessoas
diferentes, dados sincronizando ao vivo.

**Você precisa:**
- [ ] 🟢 **Conta Supabase** — https://supabase.com (dá pra entrar com o GitHub, sem cartão).
- [ ] Criar um projeto (região São Paulo se aparecer). Guardar **Project URL** e
      **anon key**.
- [ ] Rodar o `docs/schema.sql` no SQL Editor (cria as tabelas). Passo a passo
      em `docs/01-SETUP-SUPABASE-R2.md`.
- [ ] Me mandar **Project URL + anon key** (a anon key pode ser pública, tudo bem).
- [ ] ⚙️ Eu troco a camada de dados (objeto `Store`) e o login pra usar o
      Supabase. O resto do app não muda.

**Limites do plano grátis (Supabase Free):** 500 MB de banco, 1 GB de arquivos,
50.000 usuários, realtime incluso. ⚠️ **Atenção:** projeto grátis **pausa se
ficar 7 dias sem nenhum acesso** — é só reativar no painel (1 clique). Enquanto
você usar, fica de pé.

---

## Fase 3 — Vídeos e fotos pesados (armazenamento)

Hoje: foto é comprimida e cabe no localStorage; **vídeo grande não persiste**
sem um storage na nuvem. Duas opções, escolha uma:

**Opção A — Supabase Storage** (mais simples, 🟢 sem cartão)
- Já vem junto com a conta Supabase da Fase 2. 1 GB grátis.
- ⚙️ Eu faço o upload das mídias pra lá e salvo só a URL.
- Bom pra começar. Limite de 1 GB enche rápido se tiver muito vídeo.

**Opção B — Cloudflare R2** (mais espaço, 🟡 pede cartão)
- 10 GB grátis + download ilimitado grátis (melhor pra muito vídeo a longo prazo).
- ⚠️ O Cloudflare **exige cadastrar um cartão pra ativar o R2**, mas **não cobra**
  enquanto ficar dentro do limite grátis. Se topar botar o cartão, é a melhor
  opção técnica. Se não quiser cartão nenhum, fica na Opção A.
- Precisa também de um **Worker** (grátis) pra gerar URL de upload segura —
  passo a passo em `docs/01-SETUP-SUPABASE-R2.md`. ⚙️ Eu escrevo o Worker.

**Recomendação:** começar pela **Opção A** (Supabase Storage, zero cartão) e só
migrar pro R2 se o espaço apertar.

---

## Resumo — contas a criar (todas grátis)

| # | Conta | Cartão? | Serve pra |
|---|-------|---------|-----------|
| 1 | Cloudflare | 🟢 não | Hospedar o site + PWA (Fase 1) |
| 2 | GitHub (opcional) | 🟢 não | Autoupdate no push (Fase 1) |
| 3 | Supabase | 🟢 não | Login nuvem + banco + realtime + storage 1GB (Fases 2 e 3A) |
| 4 | Cloudflare R2 | 🟡 sim* | 10GB de mídia (Fase 3B, só se quiser) |

*grátis dentro do limite; o cartão é só pra ativar.

## O que eu preciso de você, no fim das contas
1. Criar a **conta Cloudflare** e publicar a pasta `app/` no Pages (te guio no passo a passo). → app no ar.
2. Quando quiser login na nuvem: criar **Supabase**, rodar o `schema.sql`, e me mandar **URL + anon key**.
3. Me dizer se topa cartão no R2 ou se fica no Supabase Storage pra mídia.

Com isso eu faço todo o resto no código.
