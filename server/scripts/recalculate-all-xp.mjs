import 'dotenv/config';
import { prisma } from '../src/lib/db.js';
import { calcularExtratoXp } from '../src/lib/xp-ledger.js';

const hoje = new Intl.DateTimeFormat('en-CA', {
  timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit',
}).format(new Date());

let corrigidos = 0;
try {
  const usuarios = await prisma.usuario.findMany({ select:{ id:true, xp:true, metaAgua:true } });
  for (const usuario of usuarios) {
    const rows = await prisma.userState.findMany({
      where:{ usuarioId:usuario.id, chave:{ in:['treino:logs','estudo:logs','estudo:materias','alim:agua','rotina:dias','xp:bonus'] } },
    });
    const estados = Object.fromEntries(rows.map(r => [r.chave, r.valor]));
    const total = calcularExtratoXp(estados, usuario, hoje).total;
    if (total !== usuario.xp) {
      await prisma.usuario.update({ where:{ id:usuario.id }, data:{ xp:total } });
      corrigidos++;
    }
  }
  console.log(`XP_RECALCULADO usuarios=${usuarios.length} corrigidos=${corrigidos}`);
} finally {
  await prisma.$disconnect();
}
