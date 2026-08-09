import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';

// Armazenamento chave-valor por usuário (dados pessoais do app).
export const stateRouter = Router();
stateRouter.use(exigirAuth);

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
  const valor = req.body?.valor;
  await prisma.userState.upsert({
    where: { usuarioId_chave: { usuarioId: req.userId, chave: req.params.chave } },
    update: { valor },
    create: { usuarioId: req.userId, chave: req.params.chave, valor },
  });
  res.json({ ok: true });
});

stateRouter.delete('/:chave', async (req, res) => {
  await prisma.userState.deleteMany({ where: { usuarioId: req.userId, chave: req.params.chave } });
  res.status(204).end();
});

export default stateRouter;
