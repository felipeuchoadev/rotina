# REDZONE na Google Play — plano completo

**Documento criado em 23/08/2026.** Este arquivo registra a decisão técnica, os
custos, o fluxo de publicação e o ponto exato de retomada. Se a conversa acabar,
leia primeiro `docs/10-STATUS-E-ROADMAP.md` e depois este documento.

## Resposta curta

Sim, o REDZONE pode ser publicado na Google Play. A opção recomendada para a
primeira versão é empacotar o PWA atual como um aplicativo Android por **Trusted
Web Activity (TWA)**, usando Bubblewrap/Android Studio e publicando um **Android
App Bundle (`.aab`)**.

Isso preserva o sistema atual em `https://redsystems.ddns.net/rotina/`, abre sem
a barra do navegador e permite instalação pela Play Store. Não é necessário
reescrever agora todo o REDZONE em Flutter, React Native ou Kotlin.

## Por que essa opção é a melhor para o REDZONE agora

- O produto já é um PWA funcional, responsivo, com manifest, service worker,
  HTTPS, funcionamento offline parcial, Web Push e atualização automática.
- O mesmo backend, banco, contas e dados continuam sendo usados pelo site e pelo
  aplicativo Android. Não nasce um segundo sistema.
- Mudanças em HTML/CSS/JS e backend continuam chegando pela internet de forma
  silenciosa, como hoje. O usuário não precisa baixar uma versão da loja para
  cada ajuste de tela, texto, regra, relatório ou correção do servidor.
- Um novo `.aab` só será necessário quando mudar a parte Android: ícone nativo,
  nome/pacote, permissões declaradas, integração nativa, nível da API, splash,
  assinatura ou configuração da TWA.
- É a rota de menor risco, menor prazo e menor tamanho para a primeira publicação.

## Tamanho estimado

Medição real do repositório em 23/08/2026:

- Arquivos públicos em `app/`: **12,68 MB**.
- `siren.mp3`: **9,16 MB**, aproximadamente 72% desse total.
- HTML principal: aproximadamente **0,39 MB**.
- Logo, ícones e avatares somados: poucos megabytes.
- Código do backend, sem dependências instaladas: aproximadamente **0,12 MB**.

Fotos, vídeos, mensagens e demais dados criados pelos usuários ficam no servidor;
eles **não são incluídos no download inicial da Play Store**. O cache do aparelho
pode crescer conforme o uso, como acontece em redes sociais, e deve continuar
com limites/limpeza apropriados.

O tamanho exato do download só pode ser informado depois de gerar o primeiro
`.aab`, porque a Play Store cria APKs otimizados para cada aparelho. A expectativa
para a casca TWA é de um download pequeno; mesmo incluindo os recursos atuais,
o REDZONE está muito abaixo do limite de 200 MB do módulo base. Antes da produção,
registrar neste arquivo os números de `bundletool get-size total` ou os exibidos
pela Play Console.

### Otimização recomendada antes da loja

Comprimir ou substituir `siren.mp3` por um arquivo equivalente menor. Essa única
ação pode reduzir bastante o pacote/cache sem mexer nas funções do aplicativo.
Não remover a sirene sem validar volume, repetição e compatibilidade no celular.

## Como funcionarão as atualizações

### Atualizações web — a maioria das mudanças

Fluxo atual continua valendo:

1. Alterar o código no repositório.
2. Testar localmente e no endereço público.
3. Publicar na VM e atualizar a versão do service worker.
4. O REDZONE aberto detecta a nova versão e atualiza silenciosamente, preservando
   aba, posição e rascunhos conforme a infraestrutura atual.

Essas atualizações não passam pela análise da Play Store, pois o executável
Android não mudou. Mesmo assim, toda mudança deve respeitar as políticas da loja;
não se pode publicar uma casca aprovada e depois transformar o serviço em algo
proibido pela web.

### Atualizações Android — quando o pacote muda

Quando houver mudança nativa, gerar um novo `.aab`, aumentar `versionCode` e
enviar uma nova versão à Play Console. A análise pode levar de algumas horas a
até sete dias ou mais em casos excepcionais. A versão anterior continua atendendo
os usuários até a nova ser aprovada/publicada.

## Custos e conta

- Conta com distribuição completa: taxa única de **US$ 25**, cobrada pelo Google.
- É necessário escolher conta pessoal ou de organização e concluir a verificação
  de identidade solicitada pela Play Console.
- Uma conta pessoal nova precisa, pelas regras atuais, de teste fechado com pelo
  menos **12 testadores inscritos continuamente por 14 dias** antes de solicitar
  acesso à produção.
- Teste interno pode ser usado primeiro e aceita até 100 testadores; normalmente
  disponibiliza builds em poucos minutos.
- Se futuramente houver assinatura, compra no app ou app pago, revisar as regras
  e taxas de faturamento vigentes antes de implementar. Hoje a publicação gratuita
  sem venda dentro do aplicativo não gera comissão sobre simples uso.

## Requisitos técnicos da primeira versão Android

1. Definir o identificador definitivo, sugestão: `net.redsystems.redzone`.
   O identificador é permanente; escolher antes da primeira publicação.
2. Criar projeto TWA com Bubblewrap e gerar o `.aab` assinado.
3. Habilitar **Play App Signing** e guardar com segurança a chave de upload e as
   senhas. Nunca colocar chaves no Git.
4. Publicar `/.well-known/assetlinks.json` no domínio com o pacote e o SHA-256
   corretos para validar que o app e o site pertencem ao mesmo responsável.
5. Usar o nome **REDZONE**, ícone RZ legível, splash coerente e cores do tema.
6. Manter `start_url`, `scope`, HTTPS e navegação dentro de `/rotina/`.
7. Compilar com o nível de API exigido na data do envio. A regra publicada para
   31/08/2026 exige Android 16/API 36 para novos apps e atualizações comuns.
8. Testar login, cadastro, recuperação, câmera, microfone, galeria, upload,
   notificações, deep links, compartilhamento, botão Voltar, offline e atualização.
9. Confirmar que links externos abrem de maneira segura e que nenhum fluxo fica
   preso em tela branca ou dentro de navegador embutido inesperado.

## Permissões

Solicitar cada permissão somente quando a função precisar dela, com explicação
clara: notificações ao habilitar alertas, câmera ao tirar foto/gravar vídeo e
microfone ao gravar áudio/vídeo. O Android controla a decisão final e pode revogar
permissões; o aplicativo não pode prometer “autorizar uma vez para sempre”.

Evitar declarar permissões que não são usadas. Quanto menos permissões nativas,
menor o risco de reprovação e maior a confiança do usuário.

## Privacidade, segurança e obrigações da loja

Antes do teste fechado/produção, é obrigatório preparar:

- Política de privacidade pública, acessível no app e por URL.
- Formulário **Data safety** coerente com o comportamento real do REDZONE e de
  bibliotecas usadas. O formulário também é exigido em testes fechados e abertos.
- Declaração dos dados tratados: conta/e-mail, perfil, fotos/vídeos/áudios,
  mensagens, publicações, rotina, treino, estudo, alimentação, peso, água,
  notificações e identificadores necessários à operação.
- Explicação das finalidades, criptografia em trânsito (HTTPS), retenção e
  exclusão. O app já possui exclusão de conta, mas o fluxo precisa ser novamente
  testado e descrito na política.
- Classificação indicativa, público-alvo, categoria, anúncios (se houver), acesso
  ao app e credencial de teste funcional para a equipe de análise.
- Canal de suporte e e-mail público do desenvolvedor. Idealmente usar domínio
  próprio da RED Systems antes da publicação.

Senhas continuam armazenadas apenas como hash. O painel administrativo não deve
nem tecnicamente consegue revelar senha original; suporte pode redefinir senha
com autorização e auditoria.

## Materiais necessários para a página da loja

- Nome: REDZONE.
- Descrição curta e descrição completa em português.
- Ícone da loja em alta resolução.
- Imagem de destaque e screenshots reais de celular/tablet.
- Política de privacidade e URL de suporte.
- E-mail/contato público.
- Categoria e classificação de conteúdo.
- Credencial de teste preparada especificamente para revisão, sem dados pessoais
  reais e com as principais funções demonstráveis.

Não usar prints com informações privadas de usuários. Não prometer “zero bugs”,
“100% perfeito” ou resultados médicos/físicos garantidos.

## Plano de execução recomendado

### Fase 0 — preservar o projeto

- Manter `main` atualizado no GitHub e a VM com backups automáticos.
- Não apagar contas ou dados para preparar a loja.
- Criar uma tag Git antes do trabalho Android, por exemplo
  `pre-android-playstore-2026-08`.

### Fase 1 — preparação do produto

- Corrigir pendências reais de `docs/10-STATUS-E-ROADMAP.md`.
- Fazer teste completo em celular e tablet Android reais.
- Reduzir `siren.mp3` e revisar cache/mídia.
- Criar política de privacidade, termos básicos e página de suporte.
- Confirmar nome jurídico/público do desenvolvedor e o identificador do pacote.

### Fase 2 — pacote Android

- Instalar/configurar JDK, Android Studio/SDK, Node e Bubblewrap.
- Gerar projeto TWA sem alterar o app web.
- Configurar ícone, splash, orientação e Digital Asset Links.
- Gerar `.aab` release assinado e medir tamanho real.
- Guardar chave de upload fora do repositório e em backup seguro.

### Fase 3 — Play Console e testes

- Criar/verificar conta de desenvolvedor e pagar a taxa, se for distribuição
  completa.
- Criar o aplicativo na Play Console e preencher todos os formulários.
- Publicar primeiro em teste interno.
- Corrigir resultados de testes automáticos e aparelhos reais.
- Iniciar teste fechado de 12 pessoas/14 dias se a conta estiver sujeita à regra.

### Fase 4 — produção

- Solicitar acesso à produção.
- Publicar gradualmente, acompanhar falhas, ANRs, avaliações e consumo de rede.
- Manter o site/PWA funcionando como alternativa e como base do aplicativo.

## Alternativas consideradas

### Módulo Android nativo para alarme exato

O alarme para sono pesado não deve depender apenas da TWA/PWA. A implementação
correta é uma camada Android nativa usando `AlarmManager`, permissão de alarme
exato, `BroadcastReceiver`, serviço em primeiro plano, notificação de tela cheia,
canal próprio de alarme e reagendamento após reiniciar o aparelho. O som deve
repetir até o usuário tocar explicitamente em **Desligar**, com opções de sirene
embutidas no aplicativo. O volume máximo continua limitado pelo sistema e pelo
hardware; o app pode usar o canal de alarme, mas não deve alterar o volume do
usuário silenciosamente.

Essa camada exige gerar, instalar e testar um APK/AAB Android; uma atualização
somente do site não consegue conceder essas garantias. Os alarmes criados no
REDZONE web devem ser sincronizados com o módulo nativo quando o app Android
estiver instalado, mantendo o backend e a interface atuais como fonte dos dados.

### Continuar somente como PWA

Mais barato e já funciona. Não oferece descoberta/confiança da Play Store e a
instalação é menos familiar para alguns usuários. Deve continuar existindo mesmo
depois da versão da loja.

### WebView/Capacitor

Permite integrações nativas mais profundas, mas cria mais código, manutenção e
risco de divergência. Pode ser uma segunda etapa se TWA não atender câmera,
notificações ou segundo plano como desejado. Uma WebView meramente vazia também
pode ter problemas de qualidade na revisão.

### Reescrever em Flutter/React Native/Kotlin

Pode entregar experiência nativa máxima, mas é praticamente um segundo produto:
mais tempo, mais custo e chance de recriar bugs já resolvidos. Não é recomendado
para a primeira publicação.

## Decisão recomendada

Publicar primeiro como **TWA**, manter o PWA como fonte única e avaliar uma camada
nativa maior somente com evidência de que alguma função essencial não funciona
bem. Isso dá presença na Play Store sem sacrificar o sistema já construído nem a
velocidade das atualizações web.

## O que ainda depende do Felipe

Não criar conta nem pagar taxa sem autorização específica. Para começar a fase
Android, confirmar:

1. Conta Play Console pessoal ou de organização.
2. Nome público/jurídico que aparecerá como desenvolvedor.
3. Identificador definitivo do pacote (sugestão: `net.redsystems.redzone`).
4. Disponibilidade de 12 testadores por 14 dias, se a conta for pessoal nova.
5. E-mail e domínio públicos para suporte e política de privacidade.

## Fontes oficiais consultadas em 23/08/2026

- [Google Play Console Help — taxa, tipos de conta e distribuição](https://support.google.com/android-developer-console/answer/16640817?hl=en).
- [Google Play Console Help — requisitos de 12 testadores por 14 dias](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB).
- [Google Play Console Help — testes internos, fechados e abertos](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en).
- [Android Developers — Android App Bundle e limites de tamanho](https://developer.android.com/guide/app-bundle/faq).
- [Android Developers — requisito de API alvo vigente](https://developer.android.com/google/play/requirements/target-sdk).
- [Google Play Console Help — Data safety e política de privacidade](https://support.google.com/googleplay/android-developer/answer/10787469).
- [Google Play Console Help — publicação, análise e processamento](https://support.google.com/googleplay/android-developer/answer/9859654).
- [Chrome Developers — visão geral de Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/overview/).

Como políticas mudam, conferir novamente as fontes oficiais na data de criar a
conta e na data de enviar o `.aab`.
