# REDZONE (ex-DISCIPLINA) — Status atual e roadmap (ponto de retomada)

> Documento vivo pra QUALQUER sessão continuar sem perder contexto. Se o chat
> zerar, leia isto + `docs/07`, `08`, `09` e os arquivos de memória.

> ⚠️ **ATENÇÃO (leia antes de "começar da onda 1"):** a lista original inteira
> (ondas 1–8) JÁ ESTÁ FEITA E NO AR há tempo, mais o rebrand **REDZONE**, a
> reformulação da **Rotina**, o **menu gaveta** no celular e a **alimentação
> semanal**. NÃO refazer nada disso. O que REALMENTE falta está em
> **"PENDENTE DE VERDADE (hoje)"** mais abaixo. App = `redzone`; nome do arquivo
> ainda é `app/disciplina-v3.html`; logo `redzone-logo.png`. Conta de teste:
> `felipeestudos220807@gmail.com` / `felipe220807@` (pergunta de segurança: time = Flamengo).

> 🟢 **v79 PUBLICADA:** central administrativa exclusiva, avisos descartáveis somente para usuários (administradores excluídos), modo suporte auditado, histórico permanente, datas importantes internas, validação de domínios de e-mail e interface ampliada.
>
> 🟢 **VERSÃO PUBLICADA: SW `redzone-v79`.** App/back no ar. Sync ao vivo ponta a ponta
> (mudou num aparelho → aparece nos outros em ms) + autoupdate ao vivo (deploy → conectados recarregam em ms)
> JÁ FUNCIONAM. Deploy = `scp app/* server/src/**` pra VM (chave `Chaves/oracle_vm`, user `ubuntu`,
> `redsystems.ddns.net:/opt/disciplina/`) + `systemctl restart disciplina` se mexeu no `server/` + **bump do SW**.

> 🛡️ **v76/v77:** painel administrativo protegido, responsividade de tablet/TV e comunicados do proprietário para todos ou para usuário específico.

## PRÓXIMA SESSÃO (combinado p/ amanhã, 2026-08-11) ⭐
**REDESIGN a partir de mockup do ChatGPT.** O Felipe gera a estética no ChatGPT e **manda a imagem**; eu
**reproduzo fiel em código**: (1) **tela de login**, (2) **página de download/landing** (`app/landing.html` →
`/rotina/landing.html`), (3) trato geral no **app**. Sempre responsivo (celular/tablet/PC) e seguindo o tema.
Ver memória [[plano-redesign-login-download]] e [[assets-via-downloads]]. Pedir a imagem em alta; confirmar
fontes/cores; manter wordmark transparente (`redzone-wordmark.png`) e emblema camuflado (`mix-blend-mode:screen`).

## PENDENTE DE VERDADE
1. **Redesign login/landing/app** (item ⭐ acima) — foco de amanhã.
2. **Domínio pro e-mail** (~R$40/ano): sem domínio o Resend só entrega pro dono; recuperação por **pergunta de
   segurança** já cobre todos. Quando houver domínio, configurar SPF/DKIM no Resend e trocar `MAIL_FROM`.
3. **Landing**: falta screenshots reais (o Felipe pode mandar prints ou exibir o painel Browser pra eu capturar).
4. Oferta pendente aceita? **Limpar dados fictícios** da conta de teste (6 matérias, 40 logs de treino, refeições
   de amostra) pra começar do zero — o Felipe ainda não confirmou; perguntar.

## ONDA 8 — no ar (feedback intenso do Felipe, SW v9→v22) ✅
- **Cadastro mobile (tela branca)**: `html{background:var(--bg2)}` (fallback escuro) resolveu a faixa branca.
  ⚠️ **Cuidado aprendido:** tirar `background-attachment:fixed` do body quebrou a topbar no desktop (virava um
  "quadrado" de cor diferente ao rolar, em temas ≠ sangue). Correção final: **manter o `fixed`** (topo sempre
  `var(--bg)` → topbar casa) + `html` escuro (mobile ok). **Testar desktop E mobile antes de subir.**
- **Deep-link pra post** (`#post=<id>`, `GET /batalha/feed/:id`, botão 🔗 compartilhar, notif de curtida/comentário
  abre o post) — coluna `alvoPostId` em Notificacao.
- **Pergunta de segurança personalizada** (opção "escrever a minha" no cadastro e na conta).
- **Logo**: wordmark transparente `redzone-wordmark.png` no topo do menu; login usa o emblema grande camuflado
  (sem o texto "REDZONE" redundante).
- **Notificações só com dados reais**: lembra SÓ o que o usuário planejou pra HOJE (estudo por `estudo:semana`,
  treino por template do dia, rotina/água) — ver [[notificacoes-so-dados-reais]]. `itemFeitoHoje()` cruza
  hábito×treino×estudo → **nunca cobra "corre" se já correu**.
- **Treino (bug grande)**: semanas **ancoradas na segunda** (`mondayOfISO`, com migração) e leitura por
  `treino:logs` (data) → o dia treinado bate com a coluna SEG..DOM; dia 100% = ✅ cobrindo, clique mostra
  exercícios + provas. (Antes lia `exec`, que estava vazio → "fiz e não aparece".)
- **Água** zera ao virar o dia (watcher no relógio re-renderiza). **Altura** com vírgula (`fmtAltura` → "1,76 m").
- **Olho na senha** (`bindPasswordEyes`), **seta ‹ Voltar** no cadastro (tema), **botão de foto colorido** +
  **remover foto** (volta pro avatar padrão do gênero). **Gráfico de peso** = barras (revertido).
- **Temas**: vermelhos hardcoded → `var(--accent)/(--accent2)` (glow do logo, calendário, flash de tema, etc.).
- **SYNC AO VIVO** (backend emite `state:changed`/`profile:changed`; front aplica com `CLIENT_ID` anti-eco) e
  **AUTOUPDATE AO VIVO** (`fs.watch` no dir do app → `app:update` a todos; reload deduplicado com controllerchange).

## ONDA 7 — no ar (bateria de correções do feedback do Felipe) ✅
Tudo testado ao vivo na VM, SW `redzone-v8`.
- **Treino/contagem**: semana só estampa "SEMANA CONCLUÍDA ✅" com **7/7 real**; janela vencida com menos
  dias vira card **"encerrada — X/7"** (sem check falso). `renderTreinoWeeks`/`currentWeekIndex` agora usam
  `brasiliaNow()` (fim do descasamento de fuso com `weekContainingToday`).
- **Try Hard**: hábito passa a ter **horário OPCIONAL** (acabou o default `06:30` forçado que fazia tudo virar
  "atrasado" o dia todo). Só cobra/treme/apita item **com horário definido que já passou**. A frase agora **cita o
  item** ("🔥 PASSOU DO HORÁRIO: {item}") via novo pool `ESC_ATRASO` — antes reusava `ESC_TRAVADA` ("furar fila"),
  que era o "pulando etapas" que aparecia por cima da tela de peso (**não era validação de peso nenhuma**).
- **Stories 24h**: `addRecordacao` grava `at` como **instante real UTC** (`new Date().toISOString()`), não mais
  `brasiliaNow()` — a janela de 24h fica exata em qualquer fuso.
- **Pergunta de segurança**: já é no cadastro (etapa 2, escolhe pergunta + resposta); agora **obrigatória no schema**
  do backend. Resposta com **match EXATO case-sensitive** (removido `toLowerCase` do `normResp`; só apara bordas).
  *Obs.: respostas antigas foram hasheadas em minúsculo — a do teste foi re-setada pra "Flamengo".*
- **Gerar publicação**: agora inclui **alimentação** (refeições feitas hoje + análise), **peso do dia**, **atividades
  da rotina do dia** e treino/estudo **mesmo sem cronômetro** (antes filtrava `min>0` e ignorava `alimSemana`).
- **Notificações úteis**: o lembrete cita **o item/horário e a matéria específica** ("Você ainda não estudou {X}
  hoje", "Não deixe de fazer {item} ({hora})") em vez de frase genérica de pool.
- **Rotina, dias futuros**: dia futuro = **só visualização** (planeja no modo edição, mas não finaliza antes de
  chegar); calendário deixa futuros **claros/esbranquiçados** e troca o **anel vermelho** do dia planejado por um
  anel branco suave.

## ONDA 6 — no ar (deep-link pra post específico) ✅
- **Backend**: novo `GET /batalha/feed/:id(\d+)` (post único, respeita bloqueio/privacidade;
  404 se não existe, 403 se indisponível). Coluna **não-destrutiva** `alvoPostId Int?` em
  `Notificacao` (`prisma db push` sem data-loss). `notificar()` agora aceita `postId`:
  curtida/comentário gravam `alvoPostId` e o push vai pra `#post=<id>` (antes caía no perfil).
- **Frontend**: `handleDeepLink()` trata `#post=<id>` → `abrirPost(id)` (sheet com o post +
  comentários + curtir/comentar). Notificação in-app de curtida/comentário abre o post
  específico (`abrirNotifAlvo` usa `alvoPostId`). Botão **🔗 compartilhar** em cada post
  (Web Share API + copiar link `…/rotina/#post=<id>`), no feed e no sheet do post.
- **Testado ao vivo** na VM: login→feed→`GET /feed/26` OK (usuario/likes/coms), `/feed/999999`=404,
  `/feed/26/comentarios`=200 (regex `\d+` não colidiu). App live já serve o código novo; SW `redzone-v7`.

## Ondas mais recentes já entregues (além da lista original)
- **Alimentação semanal**: banner "feche a semana passada" + "Finalizar semana" arquiva %saudável/%ruim em `alim:hist` e zera as refeições; gráfico de evolução por semana.
- **Rotina reformulada**: atividades por dia com horário opcional (`rotina:dias`), "repetir em semana/mês/ano/X dias", lixeira pra limpar dias; calendário ✅(100%)/✕(incompleto)/futuro no tema.
- **Menu gaveta ☰** no celular (sidebar no PC).
- **Try Hard corrigido**: sirene/tremor/esculacho SÓ quando item COM HORÁRIO passou; treino/estudo/água = lembrete gentil espaçado. Semana conta o dia real (hojeDia). Stories = últimas 24h.
- **Recuperação universal por pergunta de segurança**; som de notificação personalizável; logo texto RED/ZONE; datas com repetição dia/semana/mês/ano; legenda nas comprovações.

## Onde tudo vive
- **Código:** GitHub `felipeuchoadev/rotina` (branch `main`) — commit a cada mudança.
- **App (frontend):** arquivo único `app/disciplina-v3.html` (HTML/CSS/JS puro).
- **Backend:** `server/` — Node + Express + Socket.io + Prisma + PostgreSQL.
- **No ar:** `https://redsystems.ddns.net/rotina/` (VM Oracle Ubuntu do Felipe).
  - App em `/opt/disciplina/app`, backend em `/opt/disciplina/server` (systemd `disciplina`, porta 8090), nginx faz proxy de `/rotina/*`.
  - Segredos NA VM (não no repo): `/opt/disciplina/.dbpass` (senha do Postgres) e `server/.env` (JWT, VAPID).
  - Chave SSH: `Chaves/oracle_vm` (no workspace, ignorada no git). Usuário `ubuntu`.
- **Conta de teste do Felipe:** `felipeestudos220807@gmail.com` (senha definida por ele).

## Regras de operação (NÃO QUEBRAR)
- **NUNCA** `DELETE FROM usuarios` / `TRUNCATE` / `prisma db push --accept-data-loss` (apaga contas reais).
- Mudança de schema: `prisma db push` **sem** `--accept-data-loss` (só adiciona).
- Depois de qualquer migração/schema: executar também `prisma generate` antes de reiniciar o serviço. O script `npm run prisma:migrate` já faz os dois.
- Deploy de app = copiar `app/disciplina-v3.html` pra VM + (se backend) `systemctl restart disciplina`. Nunca tocar no banco.
- Backup automático do banco: `/opt/disciplina/backup.sh` (cron 6h).
- Testar no site ao vivo (o navegador local nega permissões de push).

## Arquitetura de dados
- Auth real (e-mail+senha, bcrypt, JWT no localStorage `disc:token`).
- Dados pessoais = blobs chave-valor por usuário (`/api/state`, camada `Store` no front).
- Cross-user: feed, ranking, follows, blocks, notificações, mensagens (DM), push_subs.
- Offline: fila de escrita local + cache; sincroniza ao reconectar.

## JÁ FEITO (no ar e testado)
- App v3 standalone → ligado ao backend (contas reais, multi-dispositivo).
- Design Modelo C (Atleta): herocard, cards suaves, 20 temas, nav lateral no desktop.
- Início: patente clicável (regras/XP), resumo do dia contando de verdade, insígnias SVG (verde+divisa branca: Recruta 0, Soldado 1, Cabo 2, 3ºSgt 3).
- Treinos: template semanal, cronômetro full-screen (bug do finalizar corrigido), comprovação foto/vídeo, **recordes + gráfico**, **vídeo de demonstração por exercício**, relatório de horas.
- Estudos: matérias (banco só-nome → página de conteúdos + **tempo por conteúdo**), agenda por dia, cronômetro, relatório.
- Alimentação: refeições da semana, **análise automática** (heurística), **água editável (＋/− pelo valor digitado, definir, zerar)**, evolução de peso.
- Rotina: hábitos + **calendário do mês** (verde/vermelho/branco) com histórico.
- Batalha = rede social: seguir, perfil clicável (posts+patente), público/privado, buscar pessoas, bloquear, 3 pontinhos (excluir/desativar comentários), sininho de notificações.
- DM (mensagens privadas) em tempo real (socket).
- Web Push (notificação com app fechado): VAPID + service worker + envio no backend (falta o Felipe aceitar permissão no aparelho real).
- Offline com sincronização.
- Edição só no modo edição (treino/estudo/alim/rotina); item feito = só ✅.
- Cadastro por data de nascimento (idade calculada), peso/altura flexíveis (vírgula/metros/8895→88,95), nav por extenso, ícones novos, "Cadastro", Enter avança, Try Hard brutal + normal 50%.
- **Nova logo (ONDA 4 — no ar)**: emblema ESA definitivo (arte gerada pelo Felipe, `app/logo-esa.png` 512²) no lugar do SVG provisório. `emblemaESA()` agora usa `<img src="logo-esa.png">` na tela de login (com drop-shadow accent). Ícones do PWA `icon-192.png`/`icon-512.png` regerados a partir da arte com **zona de segurança** (maskable) via `sharp` na VM. Service worker bumpado (`disciplina-v3-4`) pra forçar atualização dos ícones nos aparelhos. Fonte da arte fica versionada no repo.
- **Início mais estético (ONDA 3 — no ar)**: relógio + data integrados só no Início (`homeClockHTML`): hora grande em negrito + segundos em accent + data por extenso ("dom, 09 de agosto"), atualizando a cada segundo. O relógio pequenininho do canto (`clockHTML`) continua nas outras telas (topbar/batalha). Hero card (perfil) mais bonito: brilho radial em accent no canto, linha de brilho no topo, anel do avatar com glow, pill de patente com borda.
- **Treinos — arte das semanas (ONDA 2 — no ar)**: semana **concluída** ganha selo ✅ (fundo hachurado verde) e é clicável → sheet "Semana N — progresso" listando os 7 dias (feito/não, data, miniatura da prova). Semana **atual** mostra fita dos 7 dias (✓ nos treinados, destaque no dia de hoje) e também abre o progresso. Semana **travada** ganha correntes em X (SVG de elos metálicos, straps diagonais) + cadeado grande; ao tocar, a semana **treme** e o esculacho aparece por ~5s (toast com duração). `toast(msg, ms)` agora aceita duração.
- **Aniversários & datas importantes (ONDA 1 — no ar)**: seção no Início substituindo "publicação automática". Calendário GRANDE navegável (‹ › mês/ano, com virada de ano) e bolinha nos dias marcados; lista "Próximas datas" com contagem regressiva (HOJE/amanhã/em N dias) e idade que a pessoa fará. Adicionar/editar/excluir data (nome, tipo aniversário/evento, data, repete-todo-ano, avisos por marco). Banner de parabéns no próprio aniversário do usuário. Persistência: state `datas` por usuário. Notificações programadas via **backend** (`server/src/lib/agenda.js`): varre `datas` de todos os usuários 1x/dia (≥9h Brasília, dedupe no `Kv agenda:lastRun`) e dispara Web Push nos marcos 1 mês / 1 semana / 1 dia / no dia. Modelo `Kv` adicionado ao Prisma (não-destrutivo). Testado ao vivo (add/persist/editar/excluir/navegação); push real depende do device aceitar permissão.

## REBRAND REDZONE + megaleva (ondas A–E) — no ar
- **REDZONE**: app renomeado (title/manifest/SW/notify), logo nova (`redzone-logo.png`) no login (maior) e no topo do Início; ícones PWA regerados. Avatares padrão por gênero (`avatar-fem/masc.png`).
- **Visual**: relógio+data em todas as abas (tema-adaptável); nav com letras/ícones brancos; ícone de Estudos refeito; calendários menores e temáticos; esculacho da semana travada branco; textos limpos.
- **Início clicável**: idade→dias pro aniversário; kg→relatório de peso; patente/XP→histórico de pontos.
- **ENTER global** confirma/envia em sheets/formulários.
- **Conta**: gênero no cadastro/perfil; trocar e-mail; trocar senha; **excluir conta de verdade** (senha→delete cascade); **esqueci senha por e-mail** (backend `/esqueci`+`/resetar`, link `#reset=`, `lib/mail.js` via SMTP — **PENDENTE: credencial SMTP no `.env` pra enviar de verdade**; hoje loga no servidor). Notificações mostram nome de guerra + foto (default por gênero).
- **Try Hard 2.0**: som WebAudio editável (alarme/sirene/apito/sino), vibração, intervalo, **trégua após N seg no app**, submenu de opções; frases com cobrança absurda e "porrada e pancadaria".
- **Rotina**: reverter padrão. **Feed**: ↻ + puxar-pra-baixo com "nada novo". **Buscar pessoas**: tela dedicada (Instagram-like). **Permissões**: pede notificação ao entrar.
- **Recordações** (nova aba, estilo Google Fotos): álbum de mídia por data, filtros, ver/baixar/postar/excluir, +Adicionar. **Stories** no topo do feed + viewer fullscreen (7s/setas/toque). Mídia em **treino** (prova→memória, opção postar) e **alimentação** (📷 por refeição, miniatura à direita). **Postar no feed** com legenda opcional + público/privado (por post; `FeedPost.privado`). **Gerar do dia** reescrito: só dados reais em checkboxes + anexar 1 mídia.
- **Conta de teste**: `felipeestudos220807@gmail.com` / `felipe220807@` (gênero m), contas antigas removidas (backup antes), populada com dados fictícios.
- **Schema (não-destrutivo)**: +genero +resetToken +resetExp (Usuario), +privado (FeedPost). Novos state: `datas`, `recordacoes`, `rotina:plano`.

### PENDENTE (depende de você / próximo)
- **Credencial SMTP** pro reset de senha por e-mail (Gmail app-password ou Resend) no `server/.env`.
- **Site de download** (a landing `/rotina/landing.html` já existe rebrandeada; expandir se quiser).
- Deep-link pra post específico (hoje cai no perfil/feed).

## ONDA 5 — no ar (fechou a lista original toda)
- **Estudos — previsão de término**: card "Previsão de conclusão" + por matéria, com base no ritmo real (logs). Mostra faltam X de Y conteúdos, ≈horas restantes e data prevista ("no teu ritmo termina ~DD/MM"). Também dentro do sheet de cada matéria.
- **Publicação automática relocada**: saiu do Início, virou botão "⚡ Gerar do dia" na Batalha (ao lado de "Nova publicação").
- **Deep-link de notificação**: clicar na notificação cai direto no assunto. In-app: item da notificação clicável → perfil de quem interagiu (seguidor/curtida/comentário) ou Início (aviso). Push: payloads agora carregam `url` com hash (`#u=`, `#dm=`, `#tab=`); o app tem `handleDeepLink()` (no load + hashchange) e o service worker foca **e navega** o cliente aberto pro assunto.
- **Calendário editável (rotina)**: navegável (‹ ›), clicar num dia → no modo edição (hoje/futuro) escreve o plano livre e salva (`rotina:plano` = {dias, padrao}); botão "Deixar como padrão" pros dias futuros; dias passados = só visualização (não reescreve o passado). Cores: 100% → ✅, passou incompleto → número vermelho, futuro → claro, bolinha nos dias com plano.
- **Página de download universal** (`app/landing.html`, em `/rotina/landing.html`): hero com logo, botão **Instalar** (PWA `beforeinstallprompt` + fallback com instruções), botão Entrar (→ app), cards de dispositivos (celular/tablet/desktop/TV), funcionalidades, bloco "tempo real/offline/autoupdate". Registra SW + manifest.
- **Autoupdate sem F5**: app e landing recarregam sozinhos no `controllerchange` do SW; app checa update a cada 60s. Rede-first no HTML garante versão nova.
- **Try Hard**: adicionadas frases com a cobrança absurda (10^N%) e tom "porrada e pancadaria / aqui o bicho pega".
- **BUG corrigido (tempo real)**: o cliente Socket.io carregava de `/socket.io/socket.io.js` (404) em vez de `/rotina/socket.io/socket.io.js` — feed/DM/notificações ao vivo estavam **desligados**. Corrigido (deriva a base `/rotina`); socket conecta de verdade agora (testado: `connected=true`).
- **Já estavam OK (verificados)**: username só troca se não existir outro (backend 409 + msg no cliente); data de nascimento no cadastro; peso/altura com vírgula (8895→88,95); Enter avança; nomes de nav completos; ícones DM/batalha novos; texto solto do login limpo ("Rumo à Escola de Sargentos das Armas").

## Ideias futuras (não pedidas ainda)
- Deep-link pra um post específico (hoje cai no perfil de quem interagiu / na Batalha).
- Screenshots reais na landing (hoje são ícones + textos).

## Como continuar numa sessão nova
1. Ler este arquivo + memória do projeto.
2. `git pull` (código atual).
3. Escolher a próxima onda pendente, implementar em `app/disciplina-v3.html` (e `server/` se precisar).
4. Deploy: copiar arquivo(s) pra VM via SSH + restart se backend; testar no ar; commit + push.
