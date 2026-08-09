import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';
import { rankOf } from '../lib/xp.js';
import { emitFeed } from '../realtime.js';

export const batalhaRouter = Router();
batalhaRouter.use(exigirAuth);

// ---- Ranking de disciplina (XP auto-reportado, ordenado no banco) ----
batalhaRouter.get('/ranking', async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, username: true, nomeGuerra: true, fotoUrl: true, xp: true },
    orderBy: { xp: 'desc' },
  });
  res.json(usuarios.map((u) => ({ ...u, patente: rankOf(u.xp).id, patenteNome: rankOf(u.xp).name })));
});

// ---- Feed ----
batalhaRouter.get('/feed', async (req, res) => {
  const posts = await prisma.feedPost.findMany({
    orderBy: { criadoEm: 'desc' }, take: 50,
    include: {
      usuario: { select: { username: true, nomeGuerra: true, fotoUrl: true } },
      likes: { select: { usuarioId: true } },
      _count: { select: { comentarios: true } },
    },
  });
  res.json(posts);
});

const postSchema = z.object({
  texto: z.string().max(1000).optional().nullable(),
  midiaUrl: z.string().optional().nullable(),
  midiaTipo: z.enum(['foto', 'video']).optional().nullable(),
  tipo: z.enum(['treino', 'estudo', 'simulado', 'manual']).default('manual'),
});
batalhaRouter.post('/feed', async (req, res) => {
  const p = postSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ erro: 'Dados inválidos.' });
  if (!p.data.texto && !p.data.midiaUrl) return res.status(400).json({ erro: 'Coloque texto ou mídia.' });
  const post = await prisma.feedPost.create({
    data: { ...p.data, usuarioId: req.userId },
    include: { usuario: { select: { username: true, nomeGuerra: true, fotoUrl: true } }, likes: true, _count: { select: { comentarios: true } } },
  });
  emitFeed('post:novo', post); // tempo real: chega ao vivo pra todo mundo
  res.status(201).json(post);
});

// Curtir / descurtir (toggle)
batalhaRouter.post('/feed/:id/like', async (req, res) => {
  const postId = Number(req.params.id);
  const existe = await prisma.feedLike.findUnique({ where: { postId_usuarioId: { postId, usuarioId: req.userId } } });
  if (existe) await prisma.feedLike.delete({ where: { postId_usuarioId: { postId, usuarioId: req.userId } } });
  else await prisma.feedLike.create({ data: { postId, usuarioId: req.userId } });
  const total = await prisma.feedLike.count({ where: { postId } });
  emitFeed('post:like', { postId, total });
  res.json({ curtido: !existe, total });
});

// Comentar
batalhaRouter.post('/feed/:id/comentar', async (req, res) => {
  const postId = Number(req.params.id);
  const texto = String(req.body.texto || '').trim();
  if (!texto) return res.status(400).json({ erro: 'Comentário vazio.' });
  const c = await prisma.feedComment.create({
    data: { postId, usuarioId: req.userId, texto },
    include: { usuario: { select: { username: true, nomeGuerra: true } } },
  });
  emitFeed('post:comentario', c);
  res.status(201).json(c);
});
batalhaRouter.get('/feed/:id/comentarios', async (req, res) => {
  const postId = Number(req.params.id);
  const c = await prisma.feedComment.findMany({
    where: { postId }, orderBy: { criadoEm: 'asc' },
    include: { usuario: { select: { username: true, nomeGuerra: true } } },
  });
  res.json(c);
});

export default batalhaRouter;
