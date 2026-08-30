# Changelog

## v118 (30/08/2026)
- Estudos: substituída a caixa “conteúdos, um por linha” por blocos individuais. O botão “Adicionar” cria outro conteúdo; Enter no celular apenas quebra a linha dentro do conteúdo atual.
- Cada matéria continua sendo um bloco independente, e a finalização da sessão explicita o nome da matéria e lista somente os assuntos pendentes dela.
- Migração conservadora reúne matérias antigas com o mesmo nome sem perder conteúdos, conclusão, maior tempo válido, agenda ou vínculos dos registros; duplicações não são somadas como tempo/XP.
- Publicado como `redzone-v118`; sintaxe, manifesto, service worker, teste específico, serviço público, estabilidade e responsividade validados. A área privada não foi alterada com dados fictícios durante os testes.

## v1 (protótipo inicial)
- Primeira versão: bottom nav (Início, Treinos, Estudos, Batalha, Perfil),
  tema vermelho/preto único, sem login.
- Treinos: planilha editável simples por semana, foto de comprovação com
  checagem de horário do arquivo.
- Estudos: agenda semanal simples, cronômetro básico, relatório semanal/mensal.
- Batalha: ranking simples por streak, sem feed social.
- Armazenamento: `window.storage` (pessoal + compartilhado).

## v2 (atual — `app/disciplina-v2-current.html`)
- Adicionado: tela de login/cadastro (usuário + senha local, hash SHA-256
  simples), foto de perfil no cadastro.
- Patente militar com XP: Recruta → Soldado → Cabo → 3º Sargento, com regras
  de punição/promoção explicadas num modal.
- Treinos: semanas com trava por tempo real (7 dias corridos), overlay de
  cadeado com "esculacho" leve ao tentar entrar antes da hora.
- Estudos: banco de matérias com conteúdos programáveis + checklist, XP visual
  por matéria, cronômetro dentro de uma sheet modal, aba de relatórios
  separada (horas por matéria, simulados).
- Alimentação: aba nova (primeira versão, ainda com bugs — ver pendências),
  refeições do dia, peso/medidas com sparkline, planejamento de marmita.
- Batalha: ranking com posição/patente/xp, perfil público de cada usuário com
  feed simples de curtidas e comentários.
- Perfil: abas (Minha conta, Configurações, Temas, Dados), modo de edição via
  switch, 6 temas de cor (RED, AÇO, SELVA, GELO, OURO, ROSA CHOQUE).
- Fonte trocada de Oswald pra "Black Ops One" nos títulos — **decisão revertida
  no feedback seguinte** (Felipe preferiu Oswald).

## v3 (ENTREGUE — `app/disciplina-v3.html`, iteração 1, standalone localStorage)
Reescrita completa. Roda em **qualquer navegador/celular** (saiu do
`window.storage` do Claude.ai pra `localStorage`, via camada `Store` isolada
pronta pra virar Supabase). Testado no navegador (login, cadastro 2 etapas,
cronômetro completo, telas).

Implementado:
- **Login/cadastro**: e-mail + senha, hash **PBKDF2 + salt (100k iterações)**,
  cadastro em **2 etapas** (conta → dados pessoais), **sem botão Google**,
  **e-mail e username únicos** (validado na criação e na edição do perfil).
- **Patentes**: Recruta → Soldado → Cabo → 3º Sargento, **XP antihumano**
  (8k / 40k / 150k), **insígnias SVG próprias** (divisas em "V" + estrela,
  estilo graduação de praça BR — arte original, não brasão oficial). Selo
  aparece no Início, Perfil e **entre o nº e a foto** no ranking da Batalha.
- **Visual**: fonte **Oswald**, texto branco, tamanhos maiores, **relógio de
  Brasília** grande no canto sup. direito (só horário). Cabeçalho nome+foto
  **só no Início**; demais telas com topo neutro. Foto com `object-fit:cover`
  (recorte corrigido). Idade/peso/altura empilhados no Início.
- **Treinos**: template semanal Seg–Dom, semanas travam por tempo real com
  esculacho, edição só no **Modo de Edição** (lápis), "+semana" só em edição,
  **cronômetro full-screen dedicado (bug do "finalizar" corrigido)** com tempo
  ativo + pausado separados, **comprovação foto/vídeo** (botão único → câmera
  no modo certo) obrigatória antes de concluir, textarea auto-crescente,
  relatório de horas por exercício.
- **Estudos**: matérias com conteúdos, dia da semana mostra o **próximo
  conteúdo pendente**, cronômetro full-screen com esculacho ESA, marca
  conteúdos ao finalizar, **relatório sempre visível** (barras semana/mês/ano).
- **Alimentação** (nome corrigido): refeições da semana com ✅, **análise
  heurística**, **meta de água = peso×35ml**, peso & evolução mais abaixo,
  relatórios. Bug "Cintura/opcional" eliminado (altura obrigatória no cadastro).
- **Rotina** (aba nova): hábitos com horário + ✅ + notificação no horário.
- **Batalha**: ranking com insígnia, **compositor de post** (foto+legenda),
  feed com curtir. Publicação automática do dia a partir do Início.
- **Perfil**: Minha conta (idade/peso/altura editáveis, troca de foto com
  lápis, username único revalidado), Config (modo edição, notificações,
  **Modo Try Hard**), **20 temas** com gradiente de fundo completo.
- **PWA**: `manifest.json` + `service-worker.js` (skipWaiting/clients.claim,
  network-first no HTML) + ícones 192/512. Instalação/autoupdate só valem
  servido de um host HTTPS real.

Pendente (precisa das contas do Felipe — ver `05-PROXIMOS-PASSOS.md`):
- Supabase (auth/DB/realtime multi-dispositivo) e Cloudflare R2 (vídeo pesado).
- Compressão de vídeo real (hoje só foto é comprimida; vídeo grande só persiste
  com R2).
