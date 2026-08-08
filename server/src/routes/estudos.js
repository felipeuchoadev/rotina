import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';

export const estudosRouter = Router();
estudosRouter.use(exigirAuth);

// ---- Matérias + conteúdos ----
estudosRouter.get('/materias', async (req, res) => {
  const materias = await prisma.materia.findMany({
    where: { usuarioId: req.userId },
    include: { conteudos: { orderBy: { ordem: 'asc' } } },
    orderBy: { nome: 'asc' },
  });
  res.json(materias);
});

const materiaSchema = z.object({ nome: z.string().min(1).max(60), conteudos: z.array(z.string()).default([]) });
estudosRouter.post('/materias', async (req, res) => {
  const p = materiaSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ erro: 'Dados inválidos.' });
  const jaExiste = await prisma.materia.findFirst({ where: { usuarioId: req.userId, nome: p.data.nome } });
  if (jaExiste) return res.status(409).json({ erro: 'Matéria já existe.' });
  const materia = await prisma.materia.create({
    data: {
      usuarioId: req.userId, nome: p.data.nome,
      conteudos: { create: p.data.conteudos.map((nome, i) => ({ nome, ordem: i })) },
    },
    include: { conteudos: true },
  });
  res.status(201).json(materia);
});
// Substitui os conteúdos (mantém os concluídos por nome)
estudosRouter.put('/materias/:id', async (req, res) => {
  const id = Number(req.params.id);
  const materia = await prisma.materia.findFirst({ where: { id, usuarioId: req.userId }, include: { conteudos: true } });
  if (!materia) return res.status(404).json({ erro: 'Não encontrada.' });
  const { nome, conteudos = [] } = req.body;
  const concluidos = new Set(materia.conteudos.filter((c) => c.concluido).map((c) => c.nome));
  await prisma.$transaction([
    prisma.conteudo.deleteMany({ where: { materiaId: id } }),
    prisma.materia.update({
      where: { id },
      data: {
        nome: nome ?? materia.nome,
        conteudos: { create: conteudos.map((n, i) => ({ nome: n, ordem: i, concluido: concluidos.has(n) })) },
      },
    }),
  ]);
  const out = await prisma.materia.findUnique({ where: { id }, include: { conteudos: { orderBy: { ordem: 'asc' } } } });
  res.json(out);
});
estudosRouter.delete('/materias/:id', async (req, res) => {
  const id = Number(req.params.id);
  const r = await prisma.materia.deleteMany({ where: { id, usuarioId: req.userId } });
  if (!r.count) return res.status(404).json({ erro: 'Não encontrada.' });
  res.status(204).end();
});
estudosRouter.patch('/conteudos/:id', async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.conteudo.findFirst({ where: { id, materia: { usuarioId: req.userId } } });
  if (!c) return res.status(404).json({ erro: 'Não encontrado.' });
  const atualizado = await prisma.conteudo.update({ where: { id }, data: { concluido: !!req.body.concluido } });
  res.json(atualizado);
});

// ---- Agenda semanal (matérias por dia) ----
estudosRouter.get('/agenda', async (req, res) => {
  const a = await prisma.estudoAgenda.findMany({ where: { usuarioId: req.userId } });
  res.json(a);
});
estudosRouter.put('/agenda/:diaSemana', async (req, res) => {
  const dia = Number(req.params.diaSemana);
  const materiaIds = Array.isArray(req.body.materiaIds) ? req.body.materiaIds.map(Number) : [];
  await prisma.$transaction([
    prisma.estudoAgenda.deleteMany({ where: { usuarioId: req.userId, diaSemana: dia } }),
    prisma.estudoAgenda.createMany({ data: materiaIds.map((materiaId) => ({ usuarioId: req.userId, diaSemana: dia, materiaId })) }),
  ]);
  res.json({ ok: true });
});

// ---- Sessões (cronômetro) ----
const sessaoSchema = z.object({
  materiaId: z.number().int().nullable().optional(),
  data: z.string(),
  duracaoSeg: z.number().int().min(0),
  pausadoSeg: z.number().int().min(0).default(0),
  conteudosConcluidos: z.array(z.number().int()).default([]),
});
estudosRouter.post('/sessoes', async (req, res) => {
  const p = sessaoSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ erro: 'Dados inválidos.' });
  const d = p.data;
  // marca conteúdos concluídos (só os do próprio usuário)
  if (d.conteudosConcluidos.length) {
    await prisma.conteudo.updateMany({
      where: { id: { in: d.conteudosConcluidos }, materia: { usuarioId: req.userId } },
      data: { concluido: true },
    });
  }
  const sessao = await prisma.estudoSessao.create({
    data: {
      usuarioId: req.userId, materiaId: d.materiaId ?? null, data: new Date(d.data),
      duracaoSeg: d.duracaoSeg, pausadoSeg: d.pausadoSeg, conteudos: d.conteudosConcluidos.length,
    },
  });
  res.status(201).json(sessao);
});
estudosRouter.get('/sessoes', async (req, res) => {
  const s = await prisma.estudoSessao.findMany({
    where: { usuarioId: req.userId }, include: { materia: true }, orderBy: { data: 'desc' },
  });
  res.json(s);
});

export default estudosRouter;
