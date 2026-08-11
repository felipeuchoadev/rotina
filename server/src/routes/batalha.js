import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';
import { rankOf } from '../lib/xp.js';
import { emitFeed, emitToUser } from '../realtime.js';
import { enviarPush } from '../lib/push.js';

export const batalhaRouter = Router();
batalhaRouter.use(exigirAuth);

const pubSel = { id: true, username: true, nomeGuerra: true, fotoUrl: true, genero: true, privado: true, xp: true };

async function notificar(usuarioId, tipo, texto, deUsername, alvoPostId) {
  if (!usuarioId) return;
  try { await prisma.notificacao.create({ data: { usuarioId, tipo, texto, deUsername, alvoPostId: alvoPostId || null } }); } catch {}
  emitToUser(usuarioId, 'notif:nova', { tipo, texto });
  // deep-link: clicar na notificação cai direto no assunto
  // curtida/comentário → o post específico; seguidor → perfil de quem seguiu; senão → o feed
  const url = alvoPostId ? ('/rotina/#post=' + alvoPostId)
    : deUsername ? ('/rotina/#u=' + encodeURIComponent(deUsername))
    : '/rotina/#tab=batalha';
  enviarPush(usuarioId, { title: 'REDZONE', body: texto, tag: `${tipo}-${alvoPostId||deUsername||'social'}-${Date.now()}`, url });
}
async function contextoSocial(userId) {
  const [blkEu, blkMe, sigo] = await Promise.all([
    prisma.block.findMany({ where: { usuarioId: userId }, select: { bloqueadoId: true } }),
    prisma.block.findMany({ where: { bloqueadoId: userId }, select: { usuarioId: true } }),
    prisma.follow.findMany({ where: { seguidorId: userId }, select: { seguidoId: true } }),
  ]);
  return {
    bloqueados: new Set([...blkEu.map(b => b.bloqueadoId), ...blkMe.map(b => b.usuarioId)]),
    sigoSet: new Set(sigo.map(f => f.seguidoId)),
  };
}

// ---- Ranking (esconde quem me bloqueou / bloqueei) ----
batalhaRouter.get('/ranking', async (req, res) => {
  const { bloqueados } = await contextoSocial(req.userId);
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, username: true, nomeGuerra: true, fotoUrl: true, xp: true },
    orderBy: { xp: 'desc' }, take: 100,
  });
  res.json(usuarios.filter(u => !bloqueados.has(u.id)).map(u => ({ ...u, patente: rankOf(u.xp).id, patenteNome: rankOf(u.xp).name })));
});

// ---- Feed (respeita bloqueio e privacidade) ----
batalhaRouter.get('/feed', async (req, res) => {
  const { bloqueados, sigoSet } = await contextoSocial(req.userId);
  const posts = await prisma.feedPost.findMany({
    orderBy: { criadoEm: 'desc' }, take: 120,
    include: { usuario: { select: pubSel }, likes: { select: { usuarioId: true } }, _count: { select: { comentarios: true } } },
  });
  const visiveis = posts.filter(p =>
    !bloqueados.has(p.usuarioId) &&
    (p.usuarioId === req.userId || (!p.privado && (!p.usuario.privado || sigoSet.has(p.usuarioId))))
  ).slice(0, 50);
  res.json(visiveis);
});

// ---- Post único (deep-link #post=<id>) ----
batalhaRouter.get('/feed/:id(\\d+)', async (req, res) => {
  const id = Number(req.params.id);
  const post = await prisma.feedPost.findUnique({
    where: { id },
    include: { usuario: { select: pubSel }, likes: { select: { usuarioId: true } }, _count: { select: { comentarios: true } } },
  });
  if (!post) return res.status(404).json({ erro: 'Publicação não encontrada.' });
  const { bloqueados, sigoSet } = await contextoSocial(req.userId);
  const visivel = !bloqueados.has(post.usuarioId) &&
    (post.usuarioId === req.userId || (!post.privado && (!post.usuario.privado || sigoSet.has(post.usuarioId))));
  if (!visivel) return res.status(403).json({ erro: 'Publicação indisponível.' });
  res.json(post);
});

const postSchema = z.object({
  texto: z.string().max(1000).optional().nullable(),
  midiaUrl: z.string().optional().nullable(),
  midiaTipo: z.enum(['foto', 'video']).optional().nullable(),
  tipo: z.enum(['treino', 'estudo', 'simulado', 'manual']).default('manual'),
  privado: z.boolean().optional(),
});
batalhaRouter.post('/feed', async (req, res) => {
  const p = postSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ erro: 'Dados inválidos.' });
  if (!p.data.texto && !p.data.midiaUrl) return res.status(400).json({ erro: 'Coloque texto ou mídia.' });
  const post = await prisma.feedPost.create({
    data: { ...p.data, usuarioId: req.userId },
    include: { usuario: { select: pubSel }, likes: true, _count: { select: { comentarios: true } } },
  });
  emitFeed('post:novo', { id: post.id });
  res.status(201).json(post);
});

// Excluir post próprio
batalhaRouter.delete('/feed/:id', async (req, res) => {
  const id = Number(req.params.id);
  const r = await prisma.feedPost.deleteMany({ where: { id, usuarioId: req.userId } });
  if (!r.count) return res.status(404).json({ erro: 'Post não encontrado ou não é seu.' });
  emitFeed('post:removido', { id });
  res.status(204).end();
});

// Desativar/ativar comentários do post próprio
batalhaRouter.patch('/feed/:id', async (req, res) => {
  const id = Number(req.params.id);
  const dono = await prisma.feedPost.findFirst({ where: { id, usuarioId: req.userId } });
  if (!dono) return res.status(404).json({ erro: 'Não encontrado.' });
  const data = {};
  if (req.body.comentariosOff !== undefined) data.comentariosOff = !!req.body.comentariosOff;
  if (req.body.privado !== undefined) data.privado = !!req.body.privado;
  const post = await prisma.feedPost.update({ where: { id }, data });
  res.json({ comentariosOff: post.comentariosOff, privado: post.privado });
});

// Curtir / descurtir
batalhaRouter.post('/feed/:id/like', async (req, res) => {
  const postId = Number(req.params.id);
  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (!post) return res.status(404).json({ erro: 'Post não encontrado.' });
  const existe = await prisma.feedLike.findUnique({ where: { postId_usuarioId: { postId, usuarioId: req.userId } } });
  if (existe) await prisma.feedLike.delete({ where: { postId_usuarioId: { postId, usuarioId: req.userId } } });
  else {
    await prisma.feedLike.create({ data: { postId, usuarioId: req.userId } });
    if (post.usuarioId !== req.userId) {
      const me = await prisma.usuario.findUnique({ where: { id: req.userId }, select: { username: true, nomeGuerra: true } });
      notificar(post.usuarioId, 'curtida', `${me.nomeGuerra} curtiu sua publicação`, me.username, postId);
    }
  }
  const total = await prisma.feedLike.count({ where: { postId } });
  emitFeed('post:like', { postId, total });
  res.json({ curtido: !existe, total });
});

// Comentar (respeita comentários desativados)
batalhaRouter.post('/feed/:id/comentar', async (req, res) => {
  const postId = Number(req.params.id);
  const texto = String(req.body.texto || '').trim();
  if (!texto) return res.status(400).json({ erro: 'Comentário vazio.' });
  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (!post) return res.status(404).json({ erro: 'Post não encontrado.' });
  if (post.comentariosOff) return res.status(403).json({ erro: 'Comentários desativados nesta publicação.' });
  const c = await prisma.feedComment.create({
    data: { postId, usuarioId: req.userId, texto },
    include: { usuario: { select: { username: true, nomeGuerra: true } } },
  });
  if (post.usuarioId !== req.userId) notificar(post.usuarioId, 'comentario', `${c.usuario.nomeGuerra} comentou: "${texto.slice(0, 40)}"`, c.usuario.username, postId);
  emitFeed('post:comentario', { postId });
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

// ---- Buscar pessoas ----
batalhaRouter.get('/buscar', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const { bloqueados } = await contextoSocial(req.userId);
  const users = await prisma.usuario.findMany({
    where: { OR: [{ username: { contains: q, mode: 'insensitive' } }, { nomeGuerra: { contains: q, mode: 'insensitive' } }] },
    select: pubSel, take: 20,
  });
  res.json(users.filter(u => !bloqueados.has(u.id)).map(u => ({ ...u, patente: rankOf(u.xp).id })));
});

// ---- Perfil público de um usuário ----
batalhaRouter.get('/perfil/:username', async (req, res) => {
  const u = await prisma.usuario.findUnique({ where: { username: String(req.params.username).toLowerCase() } });
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  const isEu = u.id === req.userId;
  const [seguidores, seguindo, sigoEu, blkEu, blkMe] = await Promise.all([
    prisma.follow.count({ where: { seguidoId: u.id } }),
    prisma.follow.count({ where: { seguidorId: u.id } }),
    prisma.follow.findUnique({ where: { seguidorId_seguidoId: { seguidorId: req.userId, seguidoId: u.id } } }),
    prisma.block.findUnique({ where: { usuarioId_bloqueadoId: { usuarioId: req.userId, bloqueadoId: u.id } } }),
    prisma.block.findUnique({ where: { usuarioId_bloqueadoId: { usuarioId: u.id, bloqueadoId: req.userId } } }),
  ]);
  const podeVer = isEu || (!u.privado || !!sigoEu);
  const meBloqueou = !!blkMe;
  const posts = (podeVer && !meBloqueou) ? await prisma.feedPost.findMany({
    where: { usuarioId: u.id }, orderBy: { criadoEm: 'desc' }, take: 50,
    include: { usuario: { select: pubSel }, likes: { select: { usuarioId: true } }, _count: { select: { comentarios: true } } },
  }) : [];
  res.json({
    usuario: { id: u.id, username: u.username, nomeGuerra: u.nomeGuerra, fotoUrl: u.fotoUrl, privado: u.privado, idade: u.idade, pesoKg: u.pesoKg, alturaCm: u.alturaCm, xp: u.xp, patente: rankOf(u.xp).id, patenteNome: rankOf(u.xp).name, recordes: null },
    seguidores, seguindo, isEu, isSeguindo: !!sigoEu, euBloqueei: !!blkEu, meBloqueou, podeVer: podeVer && !meBloqueou, posts,
  });
});

// ---- Seguir / deixar de seguir ----
batalhaRouter.post('/seguir/:username', async (req, res) => {
  const alvo = await prisma.usuario.findUnique({ where: { username: String(req.params.username).toLowerCase() } });
  if (!alvo) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  if (alvo.id === req.userId) return res.status(400).json({ erro: 'Não dá pra seguir você mesmo.' });
  const key = { seguidorId_seguidoId: { seguidorId: req.userId, seguidoId: alvo.id } };
  const existe = await prisma.follow.findUnique({ where: key });
  if (existe) { await prisma.follow.delete({ where: key }); return res.json({ seguindo: false }); }
  await prisma.follow.create({ data: { seguidorId: req.userId, seguidoId: alvo.id } });
  const me = await prisma.usuario.findUnique({ where: { id: req.userId }, select: { username: true, nomeGuerra: true } });
  notificar(alvo.id, 'seguidor', `${me.nomeGuerra} começou a te seguir`, me.username);
  res.json({ seguindo: true });
});

// ---- Bloquear / desbloquear (remove follows nos dois sentidos) ----
batalhaRouter.post('/bloquear/:username', async (req, res) => {
  const alvo = await prisma.usuario.findUnique({ where: { username: String(req.params.username).toLowerCase() } });
  if (!alvo) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  if (alvo.id === req.userId) return res.status(400).json({ erro: 'Não dá pra bloquear você mesmo.' });
  const key = { usuarioId_bloqueadoId: { usuarioId: req.userId, bloqueadoId: alvo.id } };
  const existe = await prisma.block.findUnique({ where: key });
  if (existe) { await prisma.block.delete({ where: key }); return res.json({ bloqueado: false }); }
  await prisma.block.create({ data: { usuarioId: req.userId, bloqueadoId: alvo.id } });
  await prisma.follow.deleteMany({ where: { OR: [
    { seguidorId: req.userId, seguidoId: alvo.id },
    { seguidorId: alvo.id, seguidoId: req.userId },
  ] } });
  res.json({ bloqueado: true });
});

// ---- Notificações (sininho) ----
batalhaRouter.get('/notificacoes', async (req, res) => {
  const ns = await prisma.notificacao.findMany({ where: { usuarioId: req.userId }, orderBy: { criadoEm: 'desc' }, take: 50 });
  // anexa nome de guerra + foto + gênero de quem gerou a notificação
  const usernames = [...new Set(ns.map(n => n.deUsername).filter(Boolean))];
  const users = usernames.length ? await prisma.usuario.findMany({ where: { username: { in: usernames } }, select: { username: true, nomeGuerra: true, fotoUrl: true, genero: true } }) : [];
  const mapa = Object.fromEntries(users.map(u => [u.username, u]));
  const enriched = ns.map(n => ({ ...n, de: n.deUsername ? (mapa[n.deUsername] || null) : null }));
  const naoLidas = ns.filter(n => !n.lida).length;
  res.json({ notificacoes: enriched, naoLidas });
});
batalhaRouter.post('/notificacoes/lidas', async (req, res) => {
  await prisma.notificacao.updateMany({ where: { usuarioId: req.userId, lida: false }, data: { lida: true } });
  res.json({ ok: true });
});

export default batalhaRouter;
