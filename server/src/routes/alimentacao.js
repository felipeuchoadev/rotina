import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';

export const alimentacaoRouter = Router();
alimentacaoRouter.use(exigirAuth);

// ---- Refeições da semana ----
alimentacaoRouter.get('/itens', async (req, res) => {
  const itens = await prisma.alimentacaoItem.findMany({
    where: { usuarioId: req.userId }, orderBy: [{ diaSemana: 'asc' }, { ordem: 'asc' }],
  });
  res.json(itens);
});
const itemSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  nome: z.string().min(1).max(80),
  tipo: z.enum(['bom', 'neutro', 'ruim']).default('neutro'),
  descricao: z.string().max(500).optional().nullable(),
});
alimentacaoRouter.post('/itens', async (req, res) => {
  const p = itemSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ erro: 'Dados inválidos.' });
  const item = await prisma.alimentacaoItem.create({ data: { ...p.data, usuarioId: req.userId } });
  res.status(201).json(item);
});
alimentacaoRouter.patch('/itens/:id', async (req, res) => {
  const id = Number(req.params.id);
  const dono = await prisma.alimentacaoItem.findFirst({ where: { id, usuarioId: req.userId } });
  if (!dono) return res.status(404).json({ erro: 'Não encontrado.' });
  const item = await prisma.alimentacaoItem.update({ where: { id }, data: req.body });
  res.json(item);
});
alimentacaoRouter.delete('/itens/:id', async (req, res) => {
  const id = Number(req.params.id);
  const r = await prisma.alimentacaoItem.deleteMany({ where: { id, usuarioId: req.userId } });
  if (!r.count) return res.status(404).json({ erro: 'Não encontrado.' });
  res.status(204).end();
});

// ---- Água (por dia) ----
alimentacaoRouter.get('/agua', async (req, res) => {
  const a = await prisma.agua.findMany({ where: { usuarioId: req.userId }, orderBy: { data: 'desc' } });
  res.json(a);
});
alimentacaoRouter.put('/agua', async (req, res) => {
  const schema = z.object({ data: z.string(), ml: z.number().int().min(0) });
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ erro: 'Dados inválidos.' });
  const data = new Date(p.data.data); data.setHours(0, 0, 0, 0);
  const reg = await prisma.agua.upsert({
    where: { usuarioId_data: { usuarioId: req.userId, data } },
    update: { ml: p.data.ml },
    create: { usuarioId: req.userId, data, ml: p.data.ml },
  });
  res.json(reg);
});

// ---- Medidas de peso (evolução) ----
alimentacaoRouter.get('/medidas', async (req, res) => {
  const m = await prisma.medida.findMany({ where: { usuarioId: req.userId }, orderBy: { data: 'asc' } });
  res.json(m);
});
alimentacaoRouter.post('/medidas', async (req, res) => {
  const schema = z.object({ data: z.string(), pesoKg: z.number().min(30).max(250) });
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ erro: 'Dados inválidos.' });
  const medida = await prisma.medida.create({ data: { usuarioId: req.userId, data: new Date(p.data.data), pesoKg: p.data.pesoKg } });
  await prisma.usuario.update({ where: { id: req.userId }, data: { pesoKg: p.data.pesoKg } });
  res.status(201).json(medida);
});

export default alimentacaoRouter;
