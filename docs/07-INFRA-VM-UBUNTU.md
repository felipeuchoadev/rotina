# Infraestrutura self-hosted — VM Ubuntu (web + mobile)

Arquitetura pra rodar o DISCIPLINA numa VM Ubuntu própria, servindo tanto a
versão **web** quanto a **mobile**, com o mesmo backend.

## Visão geral

```
              INTERNET (HTTPS)
                    │
        ┌───────────┴─────────────── VM Ubuntu ───────────────┐
        │  Caddy  :80/:443   (reverse proxy + HTTPS automático)│
        │     ├── /            → frontend estático (PWA)       │
        │     └── /api,/realtime → PocketBase :8090            │
        │                                                      │
        │  PocketBase (1 binário):                             │
        │     • Auth (e-mail + senha, verificação)             │
        │     • Banco (SQLite)                                 │
        │     • Realtime (subscribe ao vivo)                   │
        │     • Storage de mídia (fotos/vídeos em disco)       │
        │     • Painel admin web                               │
        │                                                      │
        │  systemd (mantém no ar) · ufw + fail2ban · backup    │
        └──────────────────────────────────────────────────────┘
              ▲                              ▲
              │ mesma API                    │ mesma API
     ┌────────┴─────────┐          ┌─────────┴──────────┐
     │ WEB              │          │ MOBILE             │
     │ navegador/PWA    │          │ PWA "add to home"  │
     │ instalável       │          │ ou app Capacitor   │
     └──────────────────┘          └────────────────────┘
```

**Um código de frontend só** (o HTML/JS atual) serve web e mobile. O backend é
o mesmo pros dois.

---

## 1. A VM (o servidor)

- **Sistema:** Ubuntu Server **22.04 ou 24.04 LTS**.
- **Specs mínimas** (com PocketBase — leve): **1 vCPU, 1 GB RAM, 25 GB disco.**
  Se for usar Supabase self-hosted (alternativa pesada abaixo): 2 vCPU / 4 GB RAM.
- **Onde conseguir:**
  - 🟢 **Oracle Cloud — Always Free**: VM ARM generosa (até 4 vCPU / 24 GB RAM)
    grátis pra sempre. Melhor custo. (Cadastro pede cartão só pra verificar,
    não cobra no Always Free.)
  - 💵 VPS baratas: Hetzner (~€4/mês), Contabo, DigitalOcean (~US$4–6/mês).
- Acesso via **SSH** (chave, não senha).

## 2. Domínio + HTTPS (obrigatório)

PWA e app mobile **exigem HTTPS válido** (não serve certificado self-signed nem
IP puro). Você precisa de um nome apontando pro IP da VM:

- 💵 **Domínio próprio** (ex: `disciplina.com.br`) — ~R$40/ano no Registro.br/Namecheap.
- 🟢 **Grátis:** subdomínio no **DuckDNS** (ex: `disciplina.duckdns.org`) apontando
  pro IP da VM. Funciona 100% pra PWA e mobile.
- **Certificado TLS:** o **Caddy gera e renova sozinho** via Let's Encrypt (grátis).
  Você não mexe em certificado à mão.

## 3. Stack na VM (o que instalar)

| Camada | Software | Papel |
|---|---|---|
| Reverse proxy + HTTPS | **Caddy** | Recebe 80/443, HTTPS automático, serve o frontend e repassa `/api` pro backend |
| Backend (auth+db+realtime+storage) | **PocketBase** ⭐ | Tudo-em-um num binário Go. Login, banco SQLite, tempo real, upload de mídia, admin |
| Frontend | arquivos da pasta `app/` | O PWA (HTML/JS/manifest/service-worker) servido pelo Caddy |
| Processo | **systemd** | Mantém o PocketBase no ar e reinicia sozinho |
| Firewall | **ufw** | Abre só 22 (SSH), 80, 443 |
| Anti brute-force | **fail2ban** | Protege o SSH |
| Backup | **cron** | Copia a pasta `pb_data` (banco + mídia) periodicamente |

**Por que PocketBase e não Supabase self-hosted:** o Supabase self-hosted são
~10 containers Docker (Postgres, GoTrue, Realtime, Storage, Kong…), pesa 4 GB+ de
RAM e é chato de manter. O PocketBase entrega o mesmo essencial (auth, banco,
realtime, storage) num binário só, roda numa VM de 1 GB, e o backup é copiar uma
pasta. Pro estágio do projeto, é a escolha certa. (Se um dia precisar de Postgres
de verdade e escala, migra-se pra Supabase self-hosted ou Node+Postgres — a
camada `Store` do app isola isso.)

### Ordem de instalação (resumo)
1. Criar VM Ubuntu + configurar SSH + `ufw allow 22,80,443` + `fail2ban`.
2. Apontar o domínio/DuckDNS pro IP da VM.
3. Instalar **Caddy** (repo oficial apt).
4. Baixar o binário **PocketBase**, rodar como serviço **systemd** na porta 8090.
5. Configurar o **Caddyfile**: servir `app/` na raiz e proxy `/api` + `/_` pro PocketBase.
6. Subir os arquivos do `app/` pra VM (scp/git).
7. Criar as **coleções** no PocketBase (usuários, treinos, estudos, alimentação,
   rotina, feed…) espelhando o `schema.sql`.
8. **⚙️ Eu troco no código** a camada `Store` e o login pra usar o SDK do
   PocketBase (`pocketbase` JS) em vez do localStorage.
9. `cron` de backup do `pb_data`.

## 4. Web vs Mobile

**Mesmo frontend, mesmo backend.** O que muda é a entrega:

- **Web:** navegador acessa `https://seu-dominio` → é PWA, instalável no desktop.
- **Mobile — caminho 1 (grátis, recomendado começar):** abre a mesma URL no
  celular → "Adicionar à tela inicial" → vira app com ícone, tela cheia,
  autoupdate. Zero custo, zero loja.
- **Mobile — caminho 2 (app nativo em loja, opcional):** empacotar o mesmo
  HTML/JS com **Capacitor** →
  - **Android:** gera APK. Distribui direto (grátis) ou publica na Play Store
    (💵 US$25, taxa única).
  - **iOS:** exige um **Mac** pra compilar + conta Apple Developer (💵 US$99/ano).
  - Vantagem do Capacitor: acesso mais nativo à câmera, notificações push de
    verdade (app fechado), ícone na loja. Mesmo backend da VM.

> Notificação com app **fechado** (o "try hard" real) só funciona com push
> nativo — isso vem no caminho 2 (Capacitor) ou com Web Push configurado no
> backend. Com PWA puro, notifica só com o app aberto.

## 5. Operação / segurança (não esquecer)
- **SSH por chave**, desabilitar login por senha e root.
- **ufw** só com 22/80/443; **fail2ban** no SSH.
- **Backup automático** do `pb_data` (banco + mídia) — idealmente copiado pra
  fora da VM (outro storage) via cron.
- **Atualizações** do Ubuntu (`unattended-upgrades`).
- Domínio com HTTPS renovando sozinho (Caddy cuida).

## 6. Custo final
- **Zero real** se: Oracle Always Free (VM) + DuckDNS (domínio) + Caddy + PocketBase.
- Ou ~R$20–40/mês numa VPS paga + ~R$40/ano de domínio, se preferir.
- Loja de apps só se for pro caminho 2 (Play US$25 único / Apple US$99/ano).

## 7. Divisão de tarefas
**Você:** criar a VM, apontar o domínio, dar acesso SSH (ou seguir os comandos
que eu passar). **Eu:** instalar/configurar Caddy + PocketBase + systemd + backup,
criar as coleções, adaptar o código do app pra falar com o PocketBase, e (se
quiser) empacotar com Capacitor.

## Decisão que destrava o resto
Confirmar o backend: **PocketBase** (recomendado, leve) — ou prefere
**Supabase self-hosted** (Postgres, mais pesado) / **Node + PostgreSQL próprio**
(sob medida, eu escrevo tudo)? A escolha define como eu adapto o código.
