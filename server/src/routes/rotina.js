import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';

export const rotinaRouter = Router();
rotinaRouter.use(exigirAuth);

rotinaRouter.get('/', async (req, res) => {
  const itens = await prisma.rotinaItem.findMany({ where: { usuarioId: req.userId }, orderBy: { horario: 'asc' } });
  res.json(itens);
});

const schema = z.object({
  titulo: z.string().min(1).max(80),
  horario: z.string().regex(/^\d{2}:\d{2}$/),
});
rotinaRouter.post('/', async (req, res) => {
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ erro: 'Dados inválidos.' });
  const item = await prisma.rotinaItem.create({ data: { ...p.data, usuarioId: req.userId } });
  res.status(201).json(item);
});
rotinaRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const dono = await prisma.rotinaItem.findFirst({ where: { id, usuarioId: req.userId } });
  if (!dono) return res.status(404).json({ erro: 'Não encontrado.' });
  const data = {};
  if (req.body.titulo != null) data.titulo = req.body.titulo;
  if (req.body.horario != null) data.horario = req.body.horario;
  // marcar/desmarcar conclusão de hoje
  if (req.body.concluidoHoje != null) data.ultimaConclusao = req.body.concluidoHoje ? new Date() : null;
  const item = await prisma.rotinaItem.update({ where: { id }, data });
  res.json(item);
});
rotinaRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const r = await prisma.rotinaItem.deleteMany({ where: { id, usuarioId: req.userId } });
  if (!r.count) return res.status(404).json({ erro: 'Não encontrado.' });
  res.status(204).end();
});

export default rotinaRouter;
