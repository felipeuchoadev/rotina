import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';
import { publico } from './auth.js';
import { emitToUser } from '../realtime.js';

export const perfilRouter = Router();
perfilRouter.use(exigirAuth);

const editSchema = z.object({
  nomeGuerra: z.string().min(1).max(40).optional(),
  username: z.string().regex(/^[a-z0-9_]{3,20}$/).optional(),
  idade: z.number().int().min(5).max(100).optional(),
  dataNasc: z.string().nullable().optional(),
  genero: z.enum(['m', 'f']).nullable().optional(),
  pesoKg: z.number().min(1).max(500).optional(),
  alturaCm: z.number().int().min(50).max(260).optional(),
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
  if (d.dataNasc !== undefined) data.dataNasc = d.dataNasc ? new Date(d.dataNasc) : null;
  if (d.pesoKg != null) data.metaAgua = Math.round(d.pesoKg * 35);

  const usuario = await prisma.usuario.update({ where: { id: req.userId }, data });
  // sync ao vivo do perfil (nome/foto/tema/etc.) nos outros aparelhos do usuário
  emitToUser(req.userId, 'profile:changed', { usuario: publico(usuario), src: req.body?.clientId || null });
  res.json({ usuario: publico(usuario) });
});

export default perfilRouter;
