# REDZONE Android — levantamento inicial

**Data:** 03/09/2026  
**Objetivo:** transformar o REDZONE em aplicativo Android integrado ao sistema,
sem criar outro banco, outras contas ou uma versão desconectada do site.

## Decisão arquitetural inicial

Uma TWA pura continua sendo uma opção de distribuição rápida, mas não atende
sozinha à integração nativa completa solicitada. A TWA abre o PWA em tela cheia
e não oferece uma ponte contínua geral entre JavaScript e o código Android.

Para câmera, microfone, localização, notificações, alarmes confiáveis e tarefas
em segundo plano, a base recomendada é um aplicativo Android híbrido, com:

- interface REDZONE existente;
- mesmo backend, banco, login, dados e Socket.IO;
- contêiner Android controlado;
- ponte nativa limitada a funções REDZONE conhecidas;
- módulos Kotlin/Android para recursos que a Web não garante;
- permissões pedidas somente no momento em que forem necessárias.

O caminho preferencial para o primeiro protótipo é **Capacitor + módulos Android
nativos em Kotlin**. Se carregar conteúdo remoto dentro do contêiner for adotado,
a navegação e a ponte devem aceitar exclusivamente o domínio oficial do REDZONE.
Conteúdo de publicações, mensagens ou links externos nunca pode executar comandos
nativos.

## O que o projeto já possui

### Infraestrutura e produto

- PWA publicado em `https://redsystems.ddns.net/rotina/` com HTTPS.
- Manifesto web, service worker, cache e atualização automática.
- Backend Node/Express, PostgreSQL/Prisma, autenticação e Socket.IO.
- Contas e dados centralizados no servidor.
- Web Push e inscrições de dispositivos mantidas pelo backend.
- Layout responsivo e gestos para uso móvel.

### Recursos de aparelho já usados pela camada web

- câmera frontal e traseira por `getUserMedia`;
- foto e gravação de vídeo;
- microfone e gravação de mensagens de áudio;
- galeria e seleção de arquivos;
- notificações Web Push com service worker;
- vibração;
- compartilhamento do sistema quando `navigator.share` está disponível;
- tentativa de manter a tela ligada durante alarmes;
- captura nativa simples por campos de arquivo com `capture=environment`.

### Limitações atuais

- não existe implementação de GPS/localização no código atual;
- alarme contínuo com o aplicativo encerrado não é garantido pelo navegador;
- permissões são tratadas como permissões web, não como fluxo Android completo;
- câmera, microfone e arquivos dependem do comportamento do navegador;
- não há projeto Android, pacote, `AndroidManifest.xml`, Gradle ou código Kotlin;
- não há Digital Asset Links (`/.well-known/assetlinks.json`);
- não há chave de assinatura/upload criada para o aplicativo;
- política de privacidade, Data safety e página pública de suporte ainda precisam
  ser produzidas e validadas;
- o HTML principal é monolítico, com aproximadamente 496 KB, e exigirá uma camada
  de adaptação organizada para chamar funções nativas sem espalhar condicionais.

## Ambiente encontrado neste computador

### Já instalado

- Android Studio em `C:\Program Files\Android\Android Studio`.
- JBR/OpenJDK 25 incluído no Android Studio.
- Android SDK em `C:\Users\Felipe\AppData\Local\Android\Sdk`.
- Android SDK Platform API 37 instalado.
- Android Build Tools 36.0.0 instalado.
- Platform Tools/ADB 1.0.41 instalado.
- Android Emulator instalado.
- imagem de sistema Android 37.1 x86_64 instalada.
- dispositivo virtual `POCO_X7_Pro` criado.
- cache Gradle 9.5.0 existente.
- `keytool` disponível dentro do JBR do Android Studio.

Os executáveis Java, ADB e SDK não estão configurados no `PATH` global, mas podem
ser usados pelos caminhos do Android Studio/SDK enquanto o ambiente é preparado.

### Ainda instalar ou configurar

1. Node.js LTS com `npm` disponível no terminal. O Codex possui um Node interno,
   mas ele não deve ser considerado a instalação de desenvolvimento do projeto.
2. Android SDK Command-line Tools (`sdkmanager`); a pasta não foi encontrada.
3. Android SDK Platform 36. A API 37 existe, porém o alvo mínimo exigido hoje para
   novos envios à Play é API 36 e convém manter o SDK estável correspondente.
4. Variáveis `JAVA_HOME` e `ANDROID_HOME`/`ANDROID_SDK_ROOT` e inclusão de
   `platform-tools` no PATH do ambiente de desenvolvimento.
5. Capacitor CLI e pacotes Android, depois de criar um `package.json` na raiz do
   aplicativo Android.
6. Dependências Gradle do projeto, baixadas pelo wrapper gerado pelo projeto.
7. Drivers USB do aparelho físico, somente se o ADB não reconhecer o celular.

## Módulos Android previstos

### Essenciais para o primeiro protótipo

- contêiner seguro do REDZONE e navegação externa controlada;
- autenticação e persistência de sessão compatíveis com o site;
- câmera, vídeo, microfone, galeria e seletor de documentos;
- notificações Android por canal e integração com o backend;
- deep links para abrir conversa, rotina, treino e aviso corretos;
- compartilhamento nativo;
- localização precisa/aproximada sob solicitação;
- conectividade e tratamento offline;
- botão Voltar, teclado, recortes de tela e barras do sistema;
- atualização coordenada entre a camada web e a versão do contêiner.

### Alarme nativo

- `AlarmManager` para alarmes definidos pelo usuário;
- verificação de autorização para alarme exato;
- `BroadcastReceiver` e reagendamento após reinício do aparelho;
- canal de notificação de alarme;
- serviço em primeiro plano durante o toque;
- tela de alarme e ação explícita para desligar;
- integração entre alarmes salvos no REDZONE e o agendador Android;
- tratamento das restrições de bateria e permissões revogadas.

Alarmes exatos e tela cheia devem ser usados exclusivamente para alarmes reais
criados pelo usuário, respeitando as restrições e a revisão da Google Play.

## Permissões candidatas

Somente declarar as efetivamente implementadas:

- Internet e estado de rede;
- notificações (`POST_NOTIFICATIONS` nas versões aplicáveis);
- câmera;
- gravação de áudio;
- localização aproximada e, quando necessária, precisa;
- vibração;
- reagendamento após reinício;
- serviço em primeiro plano com o tipo adequado;
- alarme exato e tela cheia apenas se a função de despertador justificar e a
  Play Console aprovar seu uso.

Não pedir localização em segundo plano na primeira versão sem uma função clara e
indispensável. Galeria e arquivos devem preferir os seletores modernos do Android,
evitando acesso amplo ao armazenamento.

## Compatibilidade proposta

- `targetSdk`: 36 ou superior, conforme a exigência vigente na publicação;
- `compileSdk`: compatível com o `targetSdk` escolhido;
- `minSdk`: definir depois da análise dos aparelhos dos usuários; proposta inicial
  API 26 (Android 8), a validar antes de fixar;
- arquiteturas: as fornecidas pelo Android App Bundle, sem código NDK inicialmente;
- orientação inicial: retrato, mantendo adaptação para tablet e rotação onde fizer
  sentido;
- idioma inicial: português do Brasil.

## Ordem segura de execução

1. Criar uma tag/backup de início da migração.
2. Instalar/configurar Node LTS e Android Command-line Tools.
3. Criar o projeto Android em pasta separada, sem alterar o site em produção.
4. Gerar um protótipo debug que abre o REDZONE e usa o mesmo login/servidor.
5. Criar uma API JavaScript única (`RedzoneNative`) com fallback web.
6. Integrar câmera, microfone, arquivos, compartilhamento e localização.
7. Integrar push/deep links sem duplicar notificações web.
8. Implementar e testar o alarme Android separadamente.
9. Testar no emulador e em pelo menos um aparelho físico com app aberto,
   minimizado, fechado, reiniciado e sob economia de bateria.
10. Preparar assinatura, política de privacidade, Data safety e materiais da loja.

## Decisões ainda necessárias antes da versão de produção

- identificador permanente do pacote (proposta: `net.redsystems.redzone`);
- Android mínimo suportado;
- nome público do desenvolvedor e e-mail de suporte;
- quais funções realmente precisam de GPS e se alguma precisa atuar em segundo
  plano;
- estratégia final de entrega da interface: pacote web embarcado com atualizações
  pela loja ou conteúdo remoto com controles rígidos e atualizações imediatas;
- conta Play Console e processo de testes exigido para essa conta.

