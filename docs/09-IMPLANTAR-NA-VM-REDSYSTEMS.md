# Implantar o DISCIPLINA na VM redsystems.ddns.net (sem quebrar nada)

Relatório da investigação da VM (feita por SSH, **somente leitura**) e o plano de
implantação isolado sob `/rotina/`.

## O que já roda na VM (NÃO MEXER)

- **Ubuntu 24.04**, x86_64, **2 vCPU, 1 GB RAM + 4 GB swap**, disco 45 GB (33 GB livres).
- **nginx** na frente (portas 80/443) com **HTTPS válido** (Let's Encrypt/certbot)
  pro domínio `redsystems.ddns.net`. Config em `/etc/nginx/sites-enabled/redvm`.
- **Node v20.20.2** já instalado. **Certbot** instalado. **Sem PostgreSQL. Sem Docker.**
- Apps existentes (serviços systemd `red-*`):

| App | Serviço | Porta interna | Rotas no nginx |
|---|---|---|---|
| RED VM Dashboard (FastAPI/uvicorn) | `red-dashboard` | 127.0.0.1:9001 | `/`, `/dashboard/`, `/mining/`, `/login`, **`/api/`**, `/hooks/` |
| RED SEB Monitor (Node) | `red-seb-monitor` | 127.0.0.1:2580 (+2580 externa) | `/redseb/`, `/downloads/`, `/download` |
| RED WhatsApp (Node/Baileys) | `red-whatsapp` | 127.0.0.1:8085 | (interno, sem nginx) |
| RED Metrônomo (estático) | — | — | `/metronomo` |

## ⚠️ Conflito que o `/rotina/` resolve

O dashboard RED **já usa `location /api/`** (vai pro uvicorn). Meu backend também
usava `/api/*` — bateria de frente. **Solução:** todo o DISCIPLINA fica sob o
prefixo **`/rotina/`**, exatamente como você sugeriu. Nada colide.

## Plano de implantação (isolado, reversível)

**Portas:** 8085, 9001, 2580 estão ocupadas → o backend do DISCIPLINA usa a
**8090** (só em 127.0.0.1). **Pasta:** `/opt/disciplina/` (não conflita com `/opt/red*`).

Mapa de rotas novo (adicionado ao server block 443 existente, sem alterar as rotas atuais):

```
https://redsystems.ddns.net/rotina/            → app estático (PWA) em /opt/disciplina/app
https://redsystems.ddns.net/rotina/api/        → backend Node  127.0.0.1:8090/api/
https://redsystems.ddns.net/rotina/socket.io/  → Socket.io     127.0.0.1:8090  (tempo real)
https://redsystems.ddns.net/rotina/uploads/    → mídia          127.0.0.1:8090/uploads/
```

### Passos (nenhum toca nos apps RED)
1. **PostgreSQL**: `apt install postgresql`, criar user/db `disciplina`. (Config
   conservadora de RAM: `shared_buffers=64MB` — a VM é de 1 GB, mas tem 4 GB de
   swap; pra uso pessoal/poucos usuários roda tranquilo.)
2. **Código**: copiar `server/` e `app/` pra `/opt/disciplina/`. `npm install` +
   `prisma migrate deploy` (cria as tabelas num banco NOVO, não encosta em nada).
3. **Serviço**: `disciplina.service` (systemd) rodando `node src/index.js` na
   8090 — mesmo padrão dos serviços `red-*`, com `Restart=always`.
4. **nginx**: **backup** do `redvm` → adicionar só o bloco de `location /rotina*`
   dentro do server 443 existente → `nginx -t` (valida) → `systemctl reload nginx`.
   Se `nginx -t` acusar qualquer coisa, restauro o backup na hora. Zero downtime
   pros apps RED.
5. **HTTPS**: já existe pro domínio — o `/rotina/` herda o mesmo certificado. Nada
   de novo a emitir.

### Ajustes que eu faço no código (por causa do prefixo /rotina)
- `manifest.json`: `start_url` e `scope` = `/rotina/`.
- `service-worker.js`: escopo `/rotina/`.
- `app/disciplina-v3.html`: `API_BASE = "/rotina/api"`, Socket.io com
  `path: "/rotina/socket.io"`, e trocar a camada `Store`/auth de `localStorage`
  por `fetch` na API (a versão online de verdade).
- `client_max_body_size` no location de upload = 60 MB (o server RED usa 20 MB;
  não altero o global, só o do /rotina).

## Pontos de atenção
- **RAM (1 GB):** o gargalo. Com 4 GB de swap e os apps atuais usando ~460 MB,
  sobra pra Postgres + Node. Pra app pessoal, ok. Se um dia pesar, dá pra trocar
  o Postgres por SQLite (mais leve) — a camada de dados isola isso.
- **Backup:** já configuro `pg_dump` + `uploads` em cron, sem interferir nos apps RED.
- **Reversível:** se quiser remover, é parar/desabilitar `disciplina.service`,
  tirar o bloco `/rotina*` do nginx e apagar `/opt/disciplina`. Nada nos apps RED
  é tocado.

## O que preciso de você
Só o **OK pra executar** este plano na VM (eu rodo tudo por SSH com a chave que
você deixou). Antes de mexer no nginx eu faço backup e valido com `nginx -t`.
Nenhum serviço RED é reiniciado ou alterado.
