import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) throw new Error('Informe o e-mail exato da conta.');

try {
  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) {
    console.log(JSON.stringify({ ok: true, alreadyDeleted: true, email }));
    process.exitCode = 0;
  } else {
    if (user.isAdmin) throw new Error('A exclusão de contas administrativas é bloqueada.');
    await prisma.$transaction(async tx => {
      await tx.avisoDispensa.deleteMany({ where: { usuarioId: user.id } });
      await tx.adminAviso.deleteMany({ where: { destinatarioId: user.id } });
      await tx.adminAudit.deleteMany({ where: { alvoId: user.id } });
      await tx.storyView.deleteMany({ where: { OR: [{ ownerId: user.id }, { viewerId: user.id }] } });
      await tx.stateHistory.deleteMany({ where: { usuarioId: user.id } });
      await tx.usuario.delete({ where: { id: user.id } });
    });
    console.log(JSON.stringify({ ok: true, deleted: true, email, id: user.id }));
  }
} finally {
  await prisma.$disconnect();
}
