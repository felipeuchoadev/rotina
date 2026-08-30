# REDZONE — pacote de transição para outra IA/equipe

**Atualizado em 30/08/2026.** Este é o índice oficial para continuar o projeto sem
depender do histórico de uma conversa. A ordem de leitura é obrigatória:

1. `PACOTE-REDZONE-LEIA-PRIMEIRO.md` na raiz do ZIP.
2. `docs/10-STATUS-E-ROADMAP.md` — estado funcional e pendências reais.
3. `docs/00-VISAO-GERAL.md` — produto e módulos.
4. `docs/03-DECISOES-TECNICAS.md` — decisões arquiteturais.
5. `docs/09-IMPLANTAR-NA-VM-REDSYSTEMS.md` — infraestrutura atual.
6. `docs/08-BACKEND-DEPLOY.md` — backend, banco, serviço e backup.
7. `docs/11-PLAY-STORE-PLANO-ANDROID.md` — plano Android/Google Play.
8. `docs/14-AUDITORIA-26-CAPTURAS.md` — conferência item por item do feedback visual.
9. Demais documentos, changelog, migrations e código.

## O que o pacote contém

- Snapshot completo dos arquivos versionados do repositório.
- Histórico Git portátil (`redzone-repository.bundle`), incluindo commits e
  branches presentes no repositório local no momento da exportação.
- Manifesto SHA-256 para conferir se os arquivos foram alterados/corrompidos.
- Código do PWA em `app/`.
- Backend Express/Socket.IO/Prisma em `server/`.
- Migrations e schema PostgreSQL.
- Scripts auxiliares e seed demonstrativo.
- Documentação funcional, técnica, de implantação e Play Store.
- Inventário de acessos sem senhas, tokens ou chaves privadas.

## O que não está dentro — intencionalmente

- Chave SSH privada `Chaves/oracle_vm`.
- Segredos reais de `/opt/disciplina/server/.env`.
- Senha do PostgreSQL em `/opt/disciplina/.dbpass`.
- JWT, VAPID, SMTP, cookies, tokens ou sessões.
- Banco PostgreSQL da produção e backups com dados pessoais.
- Diretório de uploads/mídias de usuários da VM.
- `node_modules`, caches e `.git` (o histórico está no `.bundle`).

Esses itens não devem ser enviados a uma IA, chat, e-mail ou armazenamento
público. Transferi-los somente por um cofre de senhas/canal criptografado para
uma pessoa autorizada. Senhas dos usuários estão em hash bcrypt e não podem ser
recuperadas; somente redefinidas pelos fluxos autorizados.

## Fonte de verdade e estado

- Repositório: `https://github.com/felipeuchoadev/rotina.git`.
- Branch de produção: `main`.
- Aplicação: `https://redsystems.ddns.net/rotina/`.
- O commit exato da exportação está em `VERSAO-EXPORTADA.txt`.
- Se o repositório remoto tiver commits mais novos que o ZIP, executar `git pull`
  e reler o topo de `docs/10-STATUS-E-ROADMAP.md` antes de alterar qualquer coisa.

## Regra de continuidade

Não refazer funcionalidades apenas porque parecem ausentes nos documentos
antigos. Primeiro conferir a versão ao vivo, o código atual e o status no topo
do roadmap. Preservar dados reais, não apagar contas/banco/uploads e não alterar
nginx, PostgreSQL ou outros serviços da VM sem backup e validação.

## Como restaurar o Git a partir do pacote

Com Git instalado:

```text
git clone redzone-repository.bundle redzone
cd redzone
git remote set-url origin https://github.com/felipeuchoadev/rotina.git
git checkout main
git pull origin main
```

O diretório `snapshot/` também pode ser aberto diretamente, mas o `.bundle` é o
meio recomendado porque mantém o histórico.

## Entrega segura de acessos

Consulte `ACESSOS-E-SEGREDOS-NAO-INCLUIDOS.md`. O arquivo informa usuários,
endereços, serviços e locais dos segredos, mas não revela valores. Quem continuar
deve receber os valores diretamente do proprietário e testar acesso sem copiá-los
para o Git.
