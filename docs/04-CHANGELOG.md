# Changelog

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

## v3 (planejada — ainda não iniciada)
Ver `02-PENDENCIAS-PROXIMA-SESSAO.md` pra lista completa. Resumo das mudanças
estruturais mais importantes:
- Cadastro em duas etapas (conta primeiro, dados pessoais depois).
- Modelo de "template semanal" pra Treinos e Estudos (em vez de conteúdo
  duplicado por semana).
- Cronômetro full-screen dedicado (correção do bug de "finalizar" não
  funcionar).
- Comprovação por foto/vídeo direto da câmera (sem link de vídeo manual).
- Aba Rotina (esquecida na v2).
- 20 temas com gradiente de fundo completo.
- Início de migração de arquitetura: Supabase (auth + banco + realtime) +
  Cloudflare R2 (mídia) + PWA real.
