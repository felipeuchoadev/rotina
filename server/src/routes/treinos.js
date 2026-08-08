import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';

export const treinosRouter = Router();
treinosRouter.use(exigirAuth);

// ---- Template semanal (exercícios por dia) ----
treinosRouter.get('/template', async (req, res) => {
  const itens = await prisma.treinoTemplate.findMany({
    where: { usuarioId: req.userId }, orderBy: [{ diaSemana: 'asc' }, { ordem: 'asc' }],
  });
  res.json(itens);
});

const exSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  nome: z.string().min(1).max(80),
  descricao: z.string().max(2000).optional().nullable(),
  ordem: z.number().int().optional(),
});
treinosRouter.post('/template', async (req, res) => {
  const p = exSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ erro: 'Dados inválidos.' });
  const item = await prisma.treinoTemplate.create({ data: { ...p.data, usuarioId: req.userId } });
  res.status(201).json(item);
});
treinosRouter.patch('/template/:id', async (req, res) => {
  const id = Number(req.params.id);
  const dono = await prisma.treinoTemplate.findFirst({ where: { id, usuarioId: req.userId } });
  if (!dono) return res.status(404).json({ erro: 'Não encontrado.' });
  const item = await prisma.treinoTemplate.update({ where: { id }, data: req.body });
  res.json(item);
});
treinosRouter.delete('/template/:id', async (req, res) => {
  const id = Number(req.params.id);
  const r = await prisma.treinoTemplate.deleteMany({ where: { id, usuarioId: req.userId } });
  if (!r.count) return res.status(404).json({ erro: 'Não encontrado.' });
  res.status(204).end();
});

// ---- Semanas (contêineres de calendário que liberam por tempo) ----
treinosRouter.get('/semanas', async (req, res) => {
  const s = await prisma.treinoSemana.findMany({ where: { usuarioId: req.userId }, orderBy: { indice: 'asc' } });
  res.json(s);
});
treinosRouter.post('/semanas', async (req, res) => {
  const ultima = await prisma.treinoSemana.findFirst({ where: { usuarioId: req.userId }, orderBy: { indice: 'desc' } });
  const indice = ultima ? ultima.indice + 1 : 0;
  const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
  if (ultima) { inicio.setTime(new Date(ultima.inicioData).getTime()); inicio.setDate(inicio.getDate() + 7); }
  const semana = await prisma.treinoSemana.create({ data: { usuarioId: req.userId, indice, inicioData: inicio } });
  res.status(201).json(semana);
});

// ---- Execuções (registro do cronômetro + comprovação) ----
const execSchema = z.object({
  data: z.string(), // ISO date
  diaSemana: z.number().int().min(0).max(6),
  duracaoSeg: z.number().int().min(0),
  pausadoSeg: z.number().int().min(0).default(0),
  midiaUrl: z.string().optional().nullable(),
  midiaTipo: z.enum(['foto', 'video']).optional().nullable(),
});
treinosRouter.post('/execucoes', async (req, res) => {
  const p = execSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ erro: 'Dados inválidos.' });
  const d = p.data;
  const exec = await prisma.treinoExecucao.create({
    data: {
      usuarioId: req.userId, data: new Date(d.data), diaSemana: d.diaSemana, concluido: true,
      duracaoSeg: d.duracaoSeg, pausadoSeg: d.pausadoSeg, midiaUrl: d.midiaUrl, midiaTipo: d.midiaTipo,
    },
  });
  res.status(201).json(exec);
});
treinosRouter.get('/execucoes', async (req, res) => {
  const execs = await prisma.treinoExecucao.findMany({ where: { usuarioId: req.userId }, orderBy: { data: 'desc' } });
  res.json(execs);
});

export default treinosRouter;
