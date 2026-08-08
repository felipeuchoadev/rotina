// Cálculo de XP e patente no servidor (mesma regra do front v3).
// XP "antihumano": meses de constância pra chegar a 3º Sargento.

export const RANKS = [
  { id: 'recruta', name: 'Recruta',     min: 0,      divisas: 0, estrela: false },
  { id: 'soldado', name: 'Soldado',     min: 8000,   divisas: 1, estrela: false },
  { id: 'cabo',    name: 'Cabo',        min: 40000,  divisas: 2, estrela: false },
  { id: '3sgt',    name: '3º Sargento', min: 150000, divisas: 3, estrela: true  },
];
export function rankOf(xp) {
  let r = RANKS[0];
  for (const k of RANKS) if (xp >= k.min) r = k;
  return r;
}

// Recebe os agregados do banco e devolve o XP total.
export function computeXp({ treinoMin = 0, estudoMin = 0, conteudosConcluidos = 0, diasAguaMeta = 0, xpBonus = 0 }) {
  let xp = 0;
  xp += Math.floor(treinoMin) * 1;        // 1 xp / min de treino
  xp += Math.floor(estudoMin) * 2;        // 2 xp / min de estudo
  xp += conteudosConcluidos * 40;         // 40 xp / conteúdo concluído
  xp += diasAguaMeta * 15;                // 15 xp / dia que bateu a meta de água
  xp += xpBonus;
  return Math.max(0, xp);
}

// Soma o XP de um usuário a partir das tabelas (usa o prisma passado).
export async function xpDoUsuario(prisma, usuarioId) {
  const [treino, estudo, conteudos, aguas, usuario] = await Promise.all([
    prisma.treinoExecucao.aggregate({ _sum: { duracaoSeg: true }, where: { usuarioId, concluido: true } }),
    prisma.estudoSessao.aggregate({ _sum: { duracaoSeg: true, conteudos: true }, where: { usuarioId } }),
    prisma.conteudo.count({ where: { concluido: true, materia: { usuarioId } } }),
    prisma.agua.findMany({ where: { usuarioId }, select: { ml: true } }),
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { metaAgua: true, xpBonus: true } }),
  ]);
  const meta = usuario?.metaAgua || 2500;
  const diasAguaMeta = aguas.filter((a) => a.ml >= meta).length;
  return computeXp({
    treinoMin: (treino._sum.duracaoSeg || 0) / 60,
    estudoMin: (estudo._sum.duracaoSeg || 0) / 60,
    conteudosConcluidos: conteudos,
    diasAguaMeta,
    xpBonus: usuario?.xpBonus || 0,
  });
}
