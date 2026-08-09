import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';
import { publico } from './auth.js';

export const perfilRouter = Router();
perfilRouter.use(exigirAuth);

const editSchema = z.object({
  nomeGuerra: z.string().min(1).max(40).optional(),
  username: z.string().regex(/^[a-z0-9_]{3,20}$/).optional(),
  idade: z.number().int().min(10).max(90).optional(),
  pesoKg: z.number().min(30).max(250).optional(),
  alturaCm: z.number().int().min(120).max(230).optional(),
  fotoUrl: z.string().nullable().optional(),
  tema: z.string().max(30).optional(),
  xp: z.number().int().min(0).optional(),        // XP auto-reportado (ranking)
  metaAgua: z.number().int().min(500).max(8000).optional(),
  privado: z.boolean().optional(),
});

perfilRouter.patch('/', async (req, res) => {
  const parsed = editSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: 'Dados inválidos.', detalhes: parsed.error.flatten() });
  const d = parsed.data;

  // username único (revalidado na edição, igual ao cadastro)
  if (d.username) {
    const outro = await prisma.usuario.findUnique({ where: { username: d.username } });
    if (outro && outro.id !== req.userId) return res.status(409).json({ erro: 'Username já existe.' });
  }
  const data = { ...d };
  if (d.pesoKg != null) data.metaAgua = Math.round(d.pesoKg * 35);

  const usuario = await prisma.usuario.update({ where: { id: req.userId }, data });
  res.json({ usuario: publico(usuario) });
});

export default perfilRouter;
