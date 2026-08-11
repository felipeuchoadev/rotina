import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';
import { emitToUser } from '../realtime.js';

// Armazenamento chave-valor por usuário (dados pessoais do app).
export const stateRouter = Router();
stateRouter.use(exigirAuth);

function mergeRotinaDias(atual, recebido) {
  if (!atual || typeof atual !== 'object' || !recebido || typeof recebido !== 'object') return recebido;
  const out = { ...recebido };
  for (const [iso, listaNova] of Object.entries(recebido)) {
    if (!Array.isArray(listaNova)) continue;
    const antigos = new Map((Array.isArray(atual[iso]) ? atual[iso] : []).map(a => [a.id, a]));
    out[iso] = listaNova.map(novo => {
      const velho = antigos.get(novo.id);
      return velho && Number(velho.updatedAt || 0) > Number(novo.updatedAt || 0) ? velho : novo;
    });
  }
  return out;
}

// Todos os blobs do usuário de uma vez → { chave: valor, ... }
stateRouter.get('/', async (req, res) => {
  const rows = await prisma.userState.findMany({ where: { usuarioId: req.userId } });
  const out = {};
  for (const r of rows) out[r.chave] = r.valor;
  res.json(out);
});

// Um blob específico
stateRouter.get('/:chave', async (req, res) => {
  const r = await prisma.userState.findUnique({
    where: { usuarioId_chave: { usuarioId: req.userId, chave: req.params.chave } },
  });
  res.json(r ? r.valor : null);
});

// Grava (upsert) um blob
stateRouter.put('/:chave', async (req, res) => {
  let valor = req.body?.valor;
  if (req.params.chave === 'rotina:dias') {
    const existente = await prisma.userState.findUnique({ where: { usuarioId_chave: { usuarioId: req.userId, chave: req.params.chave } } });
    valor = mergeRotinaDias(existente?.valor, valor);
  }
  await prisma.userState.upsert({
    where: { usuarioId_chave: { usuarioId: req.userId, chave: req.params.chave } },
    update: { valor },
    create: { usuarioId: req.userId, chave: req.params.chave, valor },
  });
  // sync ao vivo: avisa os OUTROS aparelhos do mesmo usuário (src = quem escreveu, pra não ecoar nele)
  emitToUser(req.userId, 'state:changed', { chave: req.params.chave, valor, src: req.body?.clientId || null });
  res.json({ ok: true, valor });
});

stateRouter.delete('/:chave', async (req, res) => {
  await prisma.userState.deleteMany({ where: { usuarioId: req.userId, chave: req.params.chave } });
  emitToUser(req.userId, 'state:changed', { chave: req.params.chave, valor: null, src: req.query.src || null });
  res.status(204).end();
});

export default stateRouter;
