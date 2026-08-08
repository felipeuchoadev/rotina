# Pendências — feedback do Felipe ainda NÃO aplicado na v2

A v2 (`app/disciplina-v2-current.html`) já tem: login/cadastro local, patente
com XP, treinos com semanas travadas por tempo, estudos com agenda + cronômetro,
alimentação básica, batalha com ranking e feed simples, perfil com temas.

Tudo abaixo foi pedido **depois** da v2 e ainda precisa ser implementado. Está
organizado por área. Onde o pedido do Felipe tinha alguma contradição com pedidos
anteriores, anotei a interpretação que fizemos sentido para resolver.

## Conta / Login

- [ ] Cadastro em **duas etapas**: (1) só e-mail + senha, (2) depois de criar a
      conta, uma tela separada pra preencher nome de guerra, username, foto,
      idade, peso, altura.
- [ ] Login por **e-mail + senha** (não por username).
- [ ] **Remover completamente** o botão "Entrar com Google" (ele não quer mais
      esse placeholder).
- [ ] Nenhum nome duplicado: **username** tem que ser único de verdade (e-mail
      também). Validar tanto na criação quanto ao editar depois no perfil.
- [ ] Senha com hash real — o Felipe mandou um exemplo de PBKDF2 + salt (bem
      mais robusto que só SHA-256 puro). Vale adotar esse padrão
      (`crypto.subtle.deriveBits` com `PBKDF2`, salt aleatório por usuário,
      100.000 iterações) em vez do hash simples da v2.
- [ ] Se formos pra Supabase de verdade, e-mail/senha passam a ser geridos pelo
      `supabase.auth` nativo (que já resolve unicidade de e-mail e hashing com
      segurança de produção) — o PBKDF2 manual só é necessário enquanto o app
      ainda roda sem Supabase.

## Patentes

- [ ] Ladder real: Recruta → Soldado → Cabo → 3º Sargento (ordem confirmada
      pelo Felipe, ele mandou o brasão da ESA como referência visual/temática).
- [ ] **Aumentar MUITO os limiares de XP** — ele achou fácil demais na v2.
      Meta: "antihumano". Sugestão: pensar em meses de constância real pra
      chegar em 3º Sargento, não semanas.
- [ ] Insígnias visuais mais "de verdade" (não só um emoji) — usar padrão de
      barras/estrelas parecido com a insígnia real de sargento do Exército
      Brasileiro (referência visual, não copiar o brasão da ESA em si, que é
      material oficial — inspirar-se no conceito de barras+estrela).
- [ ] Mostrar a imagem/selo da patente **do lado esquerdo da foto de perfil**
      (ele foi específico: "entre o número [posição no ranking] e a foto") na
      lista de Batalha, e também no Perfil e no Início.

## Visual / fontes / layout global

- [ ] Fonte: ele **não gostou de "Black Ops One"** (achou pior que a versão
      anterior). Voltar pra Oswald (ou algo parecido, mas não "quadrado"/stencil).
- [ ] Texto branco puro ("brancão"), tamanhos bem maiores em geral — ele reclamou
      várias vezes que "tudo tá muito pequeno".
- [ ] **Relógio de Brasília**: mover pro canto superior direito, fonte bem maior,
      mostrar só o horário (tirar o texto "Brasília" do lado, estava poluindo).
- [ ] Cabeçalho global (nome de guerra + foto) deve aparecer **só na tela
      Início**, não em todas as páginas. As outras páginas ficam com um topo mais
      neutro (marca + relógio).
- [ ] Bloco de topo do Início: foto de perfil consertada (estava distorcendo/
      cortando errado — provavelmente falta `object-fit: cover` num contêiner de
      proporção fixa), nome de guerra à esquerda, e logo abaixo idade/peso/altura
      empilhados, um embaixo do outro, como dado de perfil de verdade.
- [ ] Corrigir todos os lugares onde a foto de perfil aparece com tamanho/recorte
      errado (Início, Batalha, e adicionar também no Perfil).

## Treinos

- [ ] **Não permitir editar semanas futuras** de jeito nenhum (na v2 dava pra
      editar mesmo trancada — ele não quer mais isso).
- [ ] Edição só é possível via **Configurações → Modo de edição**; quando ativo,
      aparece um **lápis** do lado de cada campo editável (em vez de o campo já
      vir editável direto).
- [ ] Ao clicar numa semana trancada: xingamento/esculacho de verdade, tom pesado
      ("aqui é exército"), sem meio-termo. (Aplicamos linguagem forte mas sem
      ofensa degradante real — ver nota de tom no fim deste documento.)
- [ ] **Tirar o campo "Vídeo de referência (link)".** Substituir por
      **comprovação**: um único botão "+" que abre escolha entre Foto ou Vídeo;
      ao escolher, abre a câmera **direto no modo certo** (só foto, ou só vídeo —
      sem deixar escolher da galeria misturado). O botão "Marcar como concluído"
      só libera **depois** que a comprovação foi anexada.
  - Vídeo/foto devem ser **comprimidos no cliente antes de qualquer envio**
    (ver `03-DECISOES-TECNICAS.md` sobre isso — na v2 local isso não faz
    sentido pleno porque não tem upload de verdade ainda; passa a fazer sentido
    de verdade quando plugar R2).
- [ ] Campo "Descrição / como fazer": tirar o `resize` manual da textarea — ela
      deve **crescer automaticamente** conforme o texto, sem alça arrastável
      (visual mais profissional).
- [ ] Modelo de dados sugerido pra resolver várias reclamações de uma vez:
      um **template semanal único** (Segunda a Domingo, o que fazer em cada dia),
      editável **só no modo de edição**. As "semanas" viram apenas contêineres de
      calendário que reaproveitam esse template e vão liberando por tempo real —
      isso é exatamentente o que ele descreveu gostar no fluxo de treino ("semana
      1 dá pra editar, quando clica no dia já sabe o que tem que fazer") e pediu
      pra replicar em Estudos.
- [ ] Botão "**+ adicionar semana**" só aparece no modo de edição.
- [ ] Trocar "iniciar/pausar/finalizar" simples por **cronômetro em tela cheia**
      (fundo preto), com "Iniciar sessão de treino". Ao finalizar: mostrar tempo
      total ativo **e tempo total pausado** separadamente, depois pedir a foto de
      comprovação, then salvar.
- [ ] Relatório de **horas por tipo de exercício**, semanal/mensal/(anual quando
      houver 1 ano de dado), do mesmo jeito que Estudos.

## Estudos

- [ ] Reestruturar pra copiar o modelo de Treinos: visão semanal Segunda–Domingo
      (sem precisar do nome "Agenda"), cada dia mostra a(s) matéria(s) daquele
      dia. Editar quais matérias caem em cada dia só no modo de edição.
- [ ] Banco de matérias continua existindo (com lista de conteúdos programáticos
      dentro de cada matéria), mas ao clicar no dia → matéria, mostrar direto
      **o próximo conteúdo pendente** daquela matéria (não a lista toda de novo,
      a menos que ele queira ver tudo).
- [ ] Cronômetro em **tela cheia** igual treino, com **xingamentos mais pesados,
      referenciando a ESA especificamente**, principalmente quando a pessoa
      pausa.
- [ ] Ao finalizar sessão: mostrar tempo total + tempo pausado, permitir marcar
      quais conteúdos foram concluídos (checkbox), então "Finalizar" grava a
      sessão.
- [ ] **Relatório fica visível direto na tela**, sem precisar clicar em nada
      (hoje está numa aba separada) — horas por matéria, semanal/mensal/anual,
      gráfico.
- [ ] Simulados continuam existindo, mas revisar onde entram no fluxo novo
      (hoje ficam dentro da agenda como "matéria especial" — manter esse
      conceito, só adaptar à nova estrutura de dia/matéria).

## Alimentação

- [ ] Nome certo na navegação: "**Alimentação**", não "Comida" (bug de rótulo
      na v2 — o texto do botão ficou errado).
- [ ] Reestruturar como uma "planilha", igual Estudos/Treinos: lista de refeições
      da semana, um embaixo do outro, cada uma com checkbox ✅, editável/expansível
      quando necessário (adicionar novas linhas).
- [ ] Peso e altura **mais pra baixo** na tela (não no topo).
- [ ] **Bug corrigido no fluxo antigo**: o campo que devia ser "Altura" estava
      rotulado errado como "Cintura (cm) — opcional", e não pode ser opcional.
      Também havia um erro ao salvar (aparecia uma barra vermelha estranha, e
      só resolvia saindo e entrando de novo) — investigar a causa raiz ao
      reescrever esse fluxo (provável bug de referência a elemento do DOM que
      não existia mais no momento do evento).
- [ ] Análise "tipo IA" da semana alimentar (heurística por enquanto — ver nota
      no documento de visão geral sobre isso não ser uma IA generativa de
      verdade sem uma API paga por trás).
- [ ] **Meta de água calculada** com base em idade, peso e altura (fórmula
      simples: algo como `peso_kg * 35ml`, ajustável).
- [ ] Idade/peso/altura são preenchidos na criação da conta (etapa 2 do
      cadastro) e podem ser editados depois no Perfil.
- [ ] Relatório semanal/mensal/anual, igual as outras seções.

## Rotina (aba nova, esquecida na v2)

- [ ] Nova aba na navegação de baixo: **Início, Treinos, Alimentação, Estudos,
      Rotina, Batalha, Perfil** (confirmar com o Felipe se cabem 7 ícones ou se
      alguma dessas vira sub-item — vale perguntar antes de implementar, porque
      6 ícones já estava apertado).
- [ ] Mesmo modelo de "planilha" com checkbox ✅: hábitos com horário (ex: tomar
      banho, escovar os dentes).
- [ ] Alarme/notificação real no horário configurado.

## Notificações / "Modo Try Hard"

- [ ] Lembretes de verdade (não só um `Notification` esporádico) conectados ao
      horário de cada item de Rotina/Treino/Estudo.
- [ ] Um modo extra ("try hard"): se a pessoa não cumprir algo no horário, o
      app **insiste com notificações repetidas** até ela agir. Importante:
      isso só funciona de verdade com o app aberto (limitação de navegador —
      documentar isso claramente pro Felipe de novo quando formos implementar,
      porque é fácil ele esperar que funcione com o app fechado, o que só
      Web Push com backend real resolveria).

## Batalha

- [ ] Adicionar **compositor de post direto** na aba Batalha (bem estilo
      Strava): botão "+", escolhe foto, escreve legenda, publica no feed.
- [ ] Selo de patente **entre o número da posição e a foto** na lista de
      ranking.
- [ ] Aumentar fontes (reclamação geral de tamanho pequeno se aplica aqui
      também).

## Perfil

- [ ] Consolidar a aba "Dados" pra dentro de "Minha conta" (achou "Dados"
      redundante).
- [ ] Adicionar idade, peso, altura editáveis aqui.
- [ ] Trocar foto: deixar mais claro com um **ícone de lápis** visível (em vez
      de confiar só no clique na própria foto).
- [ ] Trocar nome de guerra/username: validar unicidade do username de novo
      nesse fluxo de edição (mesma regra do cadastro).

## Temas

- [ ] Ele gostou da ideia, mas achou os temas da v2 fracos ("só muda a cor do
      ícone"). Pediu **~20 temas novos**, com gradientes de verdade, mudando
      fundo inteiro, não só acento. Manter "RED" como tema padrão/base.

## PWA / infraestrutura (ver docs 00 e 01)

- [ ] `manifest.json` + `service-worker.js` com autoupdate (`skipWaiting` +
      `clients.claim`).
- [ ] Botão de instalar personalizado via `beforeinstallprompt`.
- [ ] Migrar a camada de dados de `window.storage` pra Supabase (auth real,
      Postgres, Realtime).
- [ ] Upload de mídia via Cloudflare R2 (com compressão no cliente antes do
      envio, e uma function/Worker pra gerar URL assinada).

## Testes / qualidade

- [ ] Bug relatado: no cronômetro da v2, "iniciar" e "pausar" funcionaram mas
      "finalizar" não fez nada em algum teste do Felipe. Causa provável: o
      cronômetro roda dentro de uma *sheet* (modal) que é recriada via
      `innerHTML`, então os `addEventListener` anexados numa renderização
      anterior podem ficar "órfãos" se a sheet for reaberta sem remover os
      listeners antigos corretamente, ou o `id` do elemento de destino mudar
      de contexto entre uma renderização e outra. **Recomendação forte pra
      próxima versão**: tirar o cronômetro de dentro do sistema de "sheet"
      genérico e fazer dele uma **view/overlay full-screen dedicada**, com
      seus próprios listeners anexados uma única vez (não recriados a cada
      abertura), e um objeto de estado (`timerSession`) resetado de forma
      explícita a cada início — isso resolve a causa raiz em vez de só
      "tentar de novo".
  - Antes de entregar qualquer nova versão, testar manualmente (ou escrever um
    pequeno teste de simulação de eventos) o ciclo completo:
    iniciar → pausar → retomar → pausar de novo → finalizar, e confirmar que o
    log é salvo corretamente em todos os casos.

## Nota sobre tom / linguagem forte

O Felipe pediu explicitamente "xingamento real" e usou linguagem forte ele
mesmo ("aqui é exército, caralho"). A abordagem correta é usar um tom duro,
de instrutor de quartel — linguagem forte com moderação, focada em pressão
motivacional (covardia, fraqueza, comparação com concorrentes de vaga), **sem**
xingamento degradante, ofensa a características pessoais, ou linguagem que
cruze pra assédio de verdade. Isso preserva a intenção dele (pressão
psicológica pesada) sem o app virar algo genuinamente abusivo.
