# Auditoria completa das 26 capturas — 26/08/2026

Versão verificada: **v122**. Esta matriz separa implementação real de limites do sistema operacional. A v122 padroniza visualmente todas as gavetas recursivas do Banco de matérias.

| Pedido | Resultado verificado |
|---|---|
| Toques/cliques acidentais | Seleção, arraste e menu contextual de imagens bloqueados; camadas fecham pelo fundo/Voltar sem atravessar ações. |
| Logo em favoritos, atalhos e notificações | Favicon, shortcut icon, Apple icon, manifesto, ícones PWA e push usam a marca com cache v117. |
| Tema na barra lateral | Gaveta usa `--accent`, `--bg` e `--bg2`; `theme-color` acompanha o tema. |
| Alarme com site fechado | Backend verifica alarmes a cada 30 s e envia push persistente. Som contínuo com processo morto depende de aplicativo Android nativo, não de página/TWA. |
| ADM legível e responsivo | Cabeçalho, cards e ferramentas reorganizados para celular/tablet/PC. |
| Estatísticas reais e clicáveis | Contadores vêm do banco; Publicações, Mensagens e Dados sincronizados abrem listagens atuais. |
| Sons/notificações sem sentido no ADM | Try Hard, permissões, avisos e sons são ignorados no ADM e no modo suporte. |
| Pesquisa de destinatário | Busca consulta o servidor por nome, e-mail ou usuário e não fica limitada aos primeiros resultados carregados. |
| Voltar do modo suporte | Banner fixo “Voltar ao painel” restaura a sessão administrativa. |
| Aviso visto pelo ADM ao entrar como usuário | Modo suporte não carrega, toca nem dispensa avisos do destinatário. |
| Permissões no modo suporte | Onboarding de permissões é bloqueado; somente o dono da conta decide no aparelho dele. |
| Boas-vindas | Texto: “Bem-vindo à Batalha, [nome]. Foco no seu objetivo.” |
| Descrição em atividade | Atividades aceitam e exibem descrição. |
| Espaçamento inferior | Safe areas, teclado, folhas e chat usam espaçamento próprio em celular/tablet/PC. |
| Despertador por arraste | Hora e minuto usam controles arrastáveis por dedo ou mouse. |
| Vários toques e prévia | Há opções suave, brisa, sinos e três sirenes, além de áudio próprio; Ouvir/Pausar funciona e fecha junto com a janela. |
| Mídia opcional na atividade | Foto ou vídeo pode ser anexado; não é obrigatório. |
| Pontuação automática no horário | A máscara insere `:` enquanto a pessoa digita e valida HH:MM. |
| Calendário por gesto e legenda | Deslizar troca o mês; botões continuam; passado, incompleto, concluído e futuro têm estados distintos e legenda simples. |
| Histórico de XP por pastas | Geral, Treinos, Estudos, Água, Rotina e Ajustes. |
| XP sem trapaça | Servidor recalcula por dados válidos; marcar e desmarcar atualiza o mesmo item e remove o ganho; cliente não grava bônus. |
| Segurança de foto/perfil | Long press/download/arraste/zoom interno bloqueados; perfil e foto geram notificações distintas, com deduplicação antispam. |
| Captura de tela | Navegador/PWA não pode bloquear captura do Android. Isso exige wrapper Android com `FLAG_SECURE`. |
| Resposta no chat | Bloco citado tem contraste, borda, espaçamento, remetente e texto truncado. |
| Atualização do feed dentro do chat | Gesto só funciona na Batalha sem camada aberta; chat e demais janelas não recebem “Nada novo”. |
| Histórico de emojis | Aba Recentes persiste emojis escolhidos e enviados. |
| GIFs e figurinhas | Galeria aceita GIF/WebP; bandeja guarda recentes; servidor preserva animação e transparência ao compactar. |
| Nova linha no celular | Enter envia somente em dispositivo de ponteiro fino/PC; teclado de toque mantém quebra de linha. |
| Matérias e conteúdos | Árvore expansível e recursiva: Matéria → Conteúdos principais/pastas → assuntos → subassuntos em qualquer profundidade. Todas as gavetas usam marcador à esquerda e seta de abrir/fechar na última coluna à direita; porcentagem e “＋” ficam alinhados antes dela. Cada bloco do editor exibe “＋ Adicionar subassunto”. Todos os ramos exibem porcentagem própria e somente assuntos finais são concluíveis. Dados antigos e vínculos são preservados. |
| Perfil acessado pelo ADM | Modo suporte não registra visualização nem vincula a identidade do usuário representado. |
| Histórico de avisos | Exibe conteúdo, destinatário (ou “Todos”), data, alcance e estado. |
| Nome “Auditoria” | Interface usa “Histórico de ações” com rótulos legíveis. |

## Testes executados

- Sintaxe do JavaScript do app e das rotas `admin`, `upload` e `batalha`.
- Manifesto JSON e alinhamento `APP_BUILD`/service worker em `redzone-v122`.
- Teste automatizado `server/scripts/test-estudos-materias.js`: migração para pasta geral; árvore recursiva; folhas estudáveis; botão “Adicionar subassunto” no editor; vínculos pai/filho; porcentagem por ramo; caminho completo; ordem/profundidade; quebra de linha no mesmo item; consolidação de matérias repetidas; preservação de progresso/tempo; atualização da agenda e dos vínculos das sessões.
- Verificações específicas automatizadas dos elementos acima.
- Local e publicado em 360×800, 390×844, 768×1024 e 1440×900; sem overflow horizontal e sem erro de console na tela pública.
- Produção: serviço `disciplina` ativo; HTML, service worker e manifesto retornando v122; site permaneceu estável, sem loop de atualização e sem erros de console em 390×844, 768×1024 e 1440×900.
- Rotas administrativas protegidas retornaram 401 sem autenticação, como esperado. Fluxos privados não foram acessados sem a conta atual.
