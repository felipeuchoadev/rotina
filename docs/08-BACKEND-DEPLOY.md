# Deploy do backend na VM Ubuntu — Node + PostgreSQL

Backend em `server/` (Express + Socket.io + Prisma). Este guia sobe tudo numa VM
Ubuntu 22.04/24.04 LTS, com Caddy fazendo HTTPS automático e proxy.

Arquitetura no servidor:
```
Caddy :443  ──┬── /            → frontend estático (pasta app/)
              ├── /api/*       → Node (Express) :8090
              ├── /socket.io/* → Node (Socket.io) :8090   (tempo real)
              └── /uploads/*   → Node (mídia)     :8090
Node (systemd) ── Prisma ── PostgreSQL :5432 (local)
```

---

## 0. Antes de começar
- Uma VM Ubuntu com acesso SSH.
- Um domínio/subdomínio apontando pro IP da VM (ex: `disciplina.duckdns.org`).
- Portas abertas: 22, 80, 443.

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
sudo apt update && sudo apt -y upgrade
sudo apt -y install git fail2ban
```

## 1. Node 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt -y install nodejs
node -v   # deve mostrar v20.x
```

## 2. PostgreSQL
```bash
sudo apt -y install postgresql
sudo -u postgres psql <<'SQL'
CREATE USER disciplina WITH PASSWORD 'TROQUE_ESTA_SENHA';
CREATE DATABASE disciplina OWNER disciplina;
SQL
```

## 3. Código + dependências
```bash
# subir o projeto (via git ou scp). Ex: pasta em /opt/disciplina
sudo mkdir -p /opt/disciplina && sudo chown $USER /opt/disciplina
# scp -r server app /opt/disciplina/   (do seu PC)  ou  git clone ...
cd /opt/disciplina/server
cp .env.example .env
nano .env   # preencher DATABASE_URL, JWT_SECRET (gerar abaixo), CORS_ORIGINS, PUBLIC_MEDIA_BASE

# gerar um JWT_SECRET forte:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

npm install
npx prisma migrate deploy   # cria as tabelas no Postgres
```

No `.env`, em produção use o domínio real, por exemplo:
```
DATABASE_URL="postgresql://disciplina:TROQUE_ESTA_SENHA@localhost:5432/disciplina?schema=public"
CORS_ORIGINS="https://disciplina.duckdns.org"
PUBLIC_MEDIA_BASE="https://disciplina.duckdns.org/uploads"
PORT=8090
```

## 4. Rodar como serviço (systemd)
Criar `/etc/systemd/system/disciplina.service`:
```ini
[Unit]
Description=DISCIPLINA API
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/disciplina/server
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```
```bash
sudo chown -R www-data:www-data /opt/disciplina/server
sudo systemctl daemon-reload
sudo systemctl enable --now disciplina
sudo systemctl status disciplina         # deve estar "active (running)"
curl http://localhost:8090/api/saude      # {"ok":true,...}
```

## 5. Caddy (HTTPS automático + proxy)
```bash
sudo apt -y install debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt -y install caddy
```
Editar `/etc/caddy/Caddyfile` (troque o domínio):
```
disciplina.duckdns.org {
    encode gzip

    # API + tempo real + mídia vão pro Node
    handle /api/* {
        reverse_proxy localhost:8090
    }
    handle /socket.io/* {
        reverse_proxy localhost:8090
    }
    handle /uploads/* {
        reverse_proxy localhost:8090
    }

    # todo o resto é o app estático (PWA)
    handle {
        root * /opt/disciplina/app
        try_files {path} /disciplina-v3.html
        file_server
    }
}
```
```bash
sudo systemctl reload caddy
```
O Caddy pega o certificado Let's Encrypt sozinho. Acesse
`https://disciplina.duckdns.org/disciplina-v3.html`.

## 6. Backup automático (cron)
```bash
sudo tee /opt/disciplina/backup.sh >/dev/null <<'SH'
#!/bin/bash
DIR=/opt/disciplina/backups && mkdir -p $DIR
STAMP=$(date +%F_%H%M)
sudo -u postgres pg_dump disciplina | gzip > $DIR/db_$STAMP.sql.gz
tar czf $DIR/uploads_$STAMP.tar.gz -C /opt/disciplina/server uploads 2>/dev/null
find $DIR -type f -mtime +14 -delete
SH
sudo chmod +x /opt/disciplina/backup.sh
echo "0 3 * * * root /opt/disciplina/backup.sh" | sudo tee /etc/cron.d/disciplina-backup
```
(Ideal: copiar os backups pra fora da VM também.)

## 7. Atualizar versão nova depois
```bash
cd /opt/disciplina && git pull   # ou scp dos arquivos novos
cd server && npm install && npx prisma migrate deploy
sudo systemctl restart disciplina
sudo systemctl reload caddy
```

---

## Próximo passo no código
Falta eu adaptar o **frontend** (`app/disciplina-v3.html`) pra falar com essa API
em vez de usar `localStorage`: trocar a implementação do objeto `Store` e do
`auth` por `fetch` nos endpoints `/api/*` + conectar o Socket.io pro feed/ranking
ao vivo. A estrutura do app já foi pensada pra isso (camada isolada), então é uma
troca contida. Faço isso assim que a VM/URL estiver de pé (preciso da URL final
pra apontar o cliente e ajustar o CORS).

## Endpoints (resumo)
- `POST /api/auth/cadastro` · `POST /api/auth/login` · `GET /api/auth/me` · `GET /api/auth/disponivel`
- `PATCH /api/perfil`
- `GET/POST/PATCH/DELETE /api/treinos/template` · `GET/POST /api/treinos/semanas` · `GET/POST /api/treinos/execucoes`
- `GET/POST/PUT/DELETE /api/estudos/materias` · `PATCH /api/estudos/conteudos/:id` · `GET/PUT /api/estudos/agenda` · `GET/POST /api/estudos/sessoes`
- `GET/POST/PATCH/DELETE /api/alimentacao/itens` · `GET/PUT /api/alimentacao/agua` · `GET/POST /api/alimentacao/medidas`
- `GET/POST/PATCH/DELETE /api/rotina`
- `GET /api/batalha/ranking` · `GET/POST /api/batalha/feed` · `POST /api/batalha/feed/:id/like` · `POST /api/batalha/feed/:id/comentar`
- `POST /api/upload` (campo `arquivo`, multipart) → `{ url, tipo }`
- Socket.io: eventos `post:novo`, `post:like`, `post:comentario`, `ranking:mudou`
