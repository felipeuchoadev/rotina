# REDZONE — acessos e segredos não incluídos no ZIP

Este inventário permite a transição sem publicar credenciais. **Não preencher
este arquivo com senhas e não versionar segredos.**

## GitHub

- Repositório: `https://github.com/felipeuchoadev/rotina.git`.
- Conta/proprietário do repositório: `felipeuchoadev`.
- Branch de produção: `main`.
- Autenticação: usar a conta GitHub do proprietário ou acesso explicitamente
  concedido. Nenhum token está incluído.

## VM de produção

- Host: `redsystems.ddns.net`.
- Usuário SSH: `ubuntu`.
- Chave privada local conhecida: `C:\Users\Felipe\Desktop\Rotina\Chaves\oracle_vm`.
- A chave está ignorada pelo Git e **não entra no pacote**.
- App: `/opt/disciplina/app`.
- Backend: `/opt/disciplina/server`.
- Serviço systemd: `disciplina`.
- Backend local: porta `8090`.
- Proxy/HTTPS: nginx; configuração citada em
  `/etc/nginx/sites-enabled/redvm`.
- Segredos do backend: `/opt/disciplina/server/.env`.
- Senha local do banco: `/opt/disciplina/.dbpass`.
- Banco: PostgreSQL local, database/user `disciplina` conforme documentação.

Antes de qualquer deploy: fazer backup, conferir `git status`, validar nginx com
`nginx -t` quando aplicável e nunca sobrescrever banco/uploads.

## Aplicação e contas

- URL: `https://redsystems.ddns.net/rotina/`.
- A antiga conta de teste `felipeestudos220807@gmail.com` foi excluída e não deve
  ser usada nem recriada automaticamente. Confirmar com o proprietário qual é a
  conta atual antes de qualquer teste autenticado.
- A conta administrativa é exclusiva do proprietário; o identificador e a senha
  devem ser fornecidos por canal seguro, nunca embutidos no frontend ou neste ZIP.
- O painel administrativo deve redefinir senhas, não exibir senhas atuais. O
  banco armazena hashes bcrypt, portanto a senha original não existe em texto
  recuperável.

## Variáveis que precisam existir na VM

Ver `server/.env.example`. Confirmar, sem copiar valores para o Git:

- `DATABASE_URL`
- `JWT_SECRET` e `JWT_EXPIRES`
- origens CORS/URL pública de mídia e app
- chaves VAPID e assunto do Web Push
- SMTP, quando configurado para recuperação por e-mail
- variáveis administrativas usadas pela versão implantada

## Itens que precisam ser exportados separadamente

Se uma nova pessoa realmente assumir a operação, o proprietário deve transferir
por canal criptografado:

1. Acesso/convite do GitHub.
2. Chave SSH privada ou, preferencialmente, uma nova chave individual adicionada
   ao servidor e a antiga revogada depois da transição.
3. Segredos do `.env` por cofre de senhas.
4. Acesso ao provedor da VM e ao DDNS/domínio.
5. Backup criptografado do PostgreSQL e uploads, somente se necessário e com
   tratamento adequado dos dados pessoais.
6. Futuramente, acesso à Play Console e chave de upload Android — nunca pelo Git.

## Observação sobre “incluir todos os acessos”

O pacote inclui este mapa completo de serviços, usuários técnicos, endereços e
locais onde cada segredo existe. Os valores secretos continuam fora do ZIP para
evitar que uma cópia do pacote dê acesso imediato à VM, banco, usuários ou GitHub.
Para uma transferência real, entregar os valores separadamente por cofre de
senhas ou criar acessos individuais e revogáveis para a pessoa autorizada.
