import { PrismaClient } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const prisma = new PrismaClient();
const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) throw new Error('Informe o e-mail exato da conta.');

const json = value => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);

try {
  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) throw new Error(`Conta não encontrada: ${email}`);
  if (user.isAdmin) throw new Error('A limpeza de contas administrativas é bloqueada.');

  const snapshot = {
    criadoEm: new Date().toISOString(),
    usuario: user,
    states: await prisma.userState.findMany({ where: { usuarioId: user.id } }),
    history: await prisma.stateHistory.findMany({ where: { usuarioId: user.id } }),
    posts: await prisma.feedPost.findMany({ where: { usuarioId: user.id }, include: { likes: true, comentarios: { include: { likes: true } } } }),
    mensagens: await prisma.mensagem.findMany({ where: { OR: [{ deId: user.id }, { paraId: user.id }] } }),
    notificacoes: await prisma.notificacao.findMany({ where: { usuarioId: user.id } })
  };
  const backupDir = resolve('backups', 'account-resets');
  await mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const backupPath = resolve(backupDir, `${email.replace(/[^a-z0-9.-]/gi, '_')}-${stamp}.json`);
  await writeFile(backupPath, json(snapshot), 'utf8');

  const result = await prisma.$transaction(async tx => {
    await tx.avisoDispensa.deleteMany({ where: { usuarioId: user.id } });
    await tx.storyView.deleteMany({ where: { OR: [{ ownerId: user.id }, { viewerId: user.id }] } });
    await tx.feedCommentLike.deleteMany({ where: { usuarioId: user.id } });
    await tx.feedComment.deleteMany({ where: { usuarioId: user.id } });
    await tx.feedLike.deleteMany({ where: { usuarioId: user.id } });
    await tx.feedPost.deleteMany({ where: { usuarioId: user.id } });
    await tx.follow.deleteMany({ where: { OR: [{ seguidorId: user.id }, { seguidoId: user.id }] } });
    await tx.block.deleteMany({ where: { OR: [{ usuarioId: user.id }, { bloqueadoId: user.id }] } });
    await tx.notificacao.deleteMany({ where: { usuarioId: user.id } });
    await tx.mensagem.deleteMany({ where: { OR: [{ deId: user.id }, { paraId: user.id }] } });
    await tx.stateHistory.deleteMany({ where: { usuarioId: user.id } });
    await tx.userState.deleteMany({ where: { usuarioId: user.id } });
    const resetId = `${Date.now()}-${crypto.randomUUID()}`;
    await tx.userState.create({
      data: { usuarioId: user.id, chave: 'system:reset', valor: { id: resetId, at: new Date().toISOString() }, versao: BigInt(Date.now()) },
    });
    return tx.usuario.update({
      where: { id: user.id },
      // ultimoAcesso nulo também funciona como um marco de sessão limpa. O
      // cliente usa o estado vazio do servidor como fonte da verdade após o
      // reset, em vez de restaurar blobs antigos guardados no aparelho.
      data: { xp: 0, bio: null, fotoUrl: null, pesoKg: null, alturaCm: null, metaAgua: 2500, tema: 'red', privado: false, bloqueado: false, ultimoAcesso: null },
      select: { id: true, email: true, username: true, nomeGuerra: true, xp: true, isAdmin: true }
    });
  });

  console.log(json({ ok: true, backupPath, usuario: result }));
} finally {
  await prisma.$disconnect();
}
