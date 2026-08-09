# DISCIPLINA — Status atual e roadmap (ponto de retomada)

> Documento vivo pra QUALQUER sessão continuar sem perder contexto. Se o chat
> zerar, leia isto + `docs/07`, `08`, `09` e os arquivos de memória.

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
- **Aniversários & datas importantes (ONDA 1 — no ar)**: seção no Início substituindo "publicação automática". Calendário GRANDE navegável (‹ › mês/ano, com virada de ano) e bolinha nos dias marcados; lista "Próximas datas" com contagem regressiva (HOJE/amanhã/em N dias) e idade que a pessoa fará. Adicionar/editar/excluir data (nome, tipo aniversário/evento, data, repete-todo-ano, avisos por marco). Banner de parabéns no próprio aniversário do usuário. Persistência: state `datas` por usuário. Notificações programadas via **backend** (`server/src/lib/agenda.js`): varre `datas` de todos os usuários 1x/dia (≥9h Brasília, dedupe no `Kv agenda:lastRun`) e dispara Web Push nos marcos 1 mês / 1 semana / 1 dia / no dia. Modelo `Kv` adicionado ao Prisma (não-destrutivo). Testado ao vivo (add/persist/editar/excluir/navegação); push real depende do device aceitar permissão.

## PENDENTE (próximas ondas — ordem sugerida)
1. **Treinos — arte das semanas**: ✅ cobrindo semana concluída (clicável p/ ver progresso); correntes (diagonais) + cadeado na semana travada; esculacho por ~5s ao clicar na travada.
2. **Início mais estético**: relógio+data integrados com bom visual (só no Início, melhorar o do canto); card de perfil mais bonito.
3. **Nova logo** do app (emblema atual é provisório).
4. **Estudos**: análise de "quanto tempo falta pra terminar" com base no ritmo.
5. **Calendário editável** (rotina/geral): no modo edição, clicar num dia e escrever o que quiser; salvar; dias passados só visualização; opção "deixar padrão"; ✅ dia 100%, número vermelho se passou incompleto, branco se futuro.
6. **Deep-link de notificação**: clicar na notificação cai direto no assunto (perfil, post, DM…).
7. **Página de download universal** (landing): funcionalidades, dispositivos (desktop/TV/celular/tablet), botão instalar (PWA `beforeinstallprompt`) + entrar; sempre atualizado ao vivo (autoupdate do service worker).

## Como continuar numa sessão nova
1. Ler este arquivo + memória do projeto.
2. `git pull` (código atual).
3. Escolher a próxima onda pendente, implementar em `app/disciplina-v3.html` (e `server/` se precisar).
4. Deploy: copiar arquivo(s) pra VM via SSH + restart se backend; testar no ar; commit + push.
