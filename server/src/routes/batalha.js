import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';
import { rankOf } from '../lib/xp.js';
import { emitFeed, emitToUser } from '../realtime.js';
import { enviarPush } from '../lib/push.js';

export const batalhaRouter = Router();
batalhaRouter.use(exigirAuth);

const pubSel = { id: true, username: true, nomeGuerra: true, bio:true, fotoUrl: true, genero: true, privado: true, xp: true, isAdmin:true };

batalhaRouter.post('/perfil/:username/visualizacao', async (req,res) => {
  const tipo=req.body?.tipo==='foto'?'foto_vista':'perfil_visto';
  const [alvo,me]=await Promise.all([
    prisma.usuario.findUnique({where:{username:String(req.params.username||'').toLowerCase()},select:{id:true,username:true}}),
    prisma.usuario.findUnique({where:{id:req.userId},select:{id:true,username:true,nomeGuerra:true,isAdmin:true}}),
  ]);
  if(!alvo)return res.status(404).json({erro:'Usuário não encontrado.'});
  if(!me||alvo.id===me.id||me.isAdmin)return res.json({ok:true,ignorada:true});
  const desde=new Date(Date.now()-10*60*1000);
  const recente=await prisma.notificacao.findFirst({where:{usuarioId:alvo.id,tipo,deUsername:me.username,criadoEm:{gte:desde}},select:{id:true}});
  if(!recente)await notificar(alvo.id,tipo,tipo==='foto_vista'?`${me.nomeGuerra} visualizou sua foto de perfil`:`${me.nomeGuerra} visualizou seu perfil`,me.username);
  res.json({ok:true});
});

async function notificar(usuarioId, tipo, texto, deUsername, alvoPostId, alvoCommentId = null) {
  if (!usuarioId) return;
  try { await prisma.notificacao.create({ data: { usuarioId, tipo, texto, deUsername, alvoPostId: alvoPostId || null, alvoCommentId } }); } catch {}
  emitToUser(usuarioId, 'notif:nova', { tipo, texto });
  // deep-link: clicar na notificação cai direto no assunto
  // curtida/comentário → o post específico; seguidor → perfil de quem seguiu; senão → o feed
  const url = alvoPostId ? ('/rotina/#post=' + alvoPostId + (alvoCommentId ? '&comment=' + alvoCommentId : ''))
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
    where: { isAdmin: false },
    select: { id: true, username: true, nomeGuerra: true, fotoUrl: true, genero: true, xp: true },
    orderBy: { xp: 'desc' }, take: 100,
  });
  res.json(usuarios.filter(u => !bloqueados.has(u.id)).map(u => ({ ...u, patente: rankOf(u.xp).id, patenteNome: rankOf(u.xp).name })));
});

// ---- Feed (respeita bloqueio e privacidade) ----
batalhaRouter.get('/feed', async (req, res) => {
  const { bloqueados, sigoSet } = await contextoSocial(req.userId);
  const limite = Math.min(30, Math.max(1, Number(req.query.limite) || 15));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const posts = await prisma.feedPost.findMany({
    orderBy: { criadoEm: 'desc' }, take: Math.min(150, offset + limite + 60),
    include: { usuario: { select: pubSel }, likes: { select: { usuarioId: true } }, _count: { select: { comentarios: true } } },
  });
  const visiveis = posts.filter(p =>
    !p.usuario.isAdmin && !bloqueados.has(p.usuarioId) &&
    (p.usuarioId === req.userId || (!p.privado && (!p.usuario.privado || sigoSet.has(p.usuarioId))))
  ).slice(offset, offset + limite);
  res.json(visiveis);
});

// URLs já publicadas pelo próprio usuário; permite ao Story mostrar "Publicar no feed"
// somente quando aquela mídia realmente ainda não foi postada, mesmo fora da primeira página.
batalhaRouter.get('/feed/meus-urls', async (req, res) => {
  const posts = await prisma.feedPost.findMany({ where: { usuarioId: req.userId }, select: { midiaUrl: true, midias:true }, orderBy: { criadoEm: 'desc' }, take: 500 });
  res.json(posts.flatMap(p => [p.midiaUrl, ...(Array.isArray(p.midias)?p.midias.map(m=>m?.url):[])]).filter(Boolean));
});

// Stories reais das últimas 24h: próprios + pessoas seguidas, respeitando privacidade.
batalhaRouter.get('/stories', async (req, res) => {
  const follows=await prisma.follow.findMany({where:{seguidorId:req.userId},select:{seguidoId:true}});
  const ids=[req.userId,...follows.map(f=>f.seguidoId)];
  const [usuarios,states]=await Promise.all([
    prisma.usuario.findMany({where:{id:{in:ids}},select:pubSel}),
    prisma.userState.findMany({where:{usuarioId:{in:ids},chave:'recordacoes'},select:{usuarioId:true,valor:true}}),
  ]);
  const limite=Date.now()-86400000,porId=new Map(usuarios.map(u=>[u.id,u]));
  const grupos=[];
  for(const s of states){const u=porId.get(s.usuarioId);if(!u||(u.privado&&u.id!==req.userId&&!follows.some(f=>f.seguidoId===u.id)))continue;const items=(Array.isArray(s.valor)?s.valor:[]).filter(r=>{const t=new Date(r?.at).getTime();return r?.id&&r?.url&&Number.isFinite(t)&&t>=limite;}).sort((a,b)=>String(a.at).localeCompare(String(b.at)));if(items.length)grupos.push({usuario:u,items});}
  grupos.sort((a,b)=>a.usuario.id===req.userId?-1:b.usuario.id===req.userId?1:String(b.items.at(-1)?.at).localeCompare(String(a.items.at(-1)?.at)));
  res.json(grupos);
});

batalhaRouter.post('/stories/:ownerId/:recordId/view', async (req,res)=>{
  const {ownerId,recordId}=req.params;if(ownerId===req.userId)return res.json({ok:true});
  const state=await prisma.userState.findUnique({where:{usuarioId_chave:{usuarioId:ownerId,chave:'recordacoes'}}});
  if(!Array.isArray(state?.valor)||!state.valor.some(r=>String(r?.id)===recordId))return res.status(404).json({erro:'Story não encontrado.'});
  await prisma.storyView.upsert({where:{ownerId_recordId_viewerId:{ownerId,recordId,viewerId:req.userId}},update:{vistoEm:new Date()},create:{ownerId,recordId,viewerId:req.userId}});res.json({ok:true});
});

batalhaRouter.get('/stories/:recordId/viewers',async(req,res)=>{
  const rows=await prisma.storyView.findMany({where:{ownerId:req.userId,recordId:req.params.recordId},orderBy:{vistoEm:'desc'},take:500});
  const usuarios=await prisma.usuario.findMany({where:{id:{in:rows.map(r=>r.viewerId)}},select:pubSel});const map=new Map(usuarios.map(u=>[u.id,u]));
  res.json(rows.map(r=>({usuario:map.get(r.viewerId),vistoEm:r.vistoEm})).filter(r=>r.usuario));
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
  midias: z.array(z.object({ url:z.string().min(1), tipo:z.enum(['foto','video']) })).max(10).optional().nullable(),
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
  const forcarCurtir = req.body?.curtir === true;
  let curtido = true;
  if (existe && !forcarCurtir) { await prisma.feedLike.delete({ where: { postId_usuarioId: { postId, usuarioId: req.userId } } }); curtido = false; }
  else {
    let criou=false; try{ if(!existe){ await prisma.feedLike.create({ data: { postId, usuarioId: req.userId } }); criou=true; } }
    catch(e){ if(e?.code==='P2002') criou=false; else throw e; }
    if (criou && post.usuarioId !== req.userId) {
      const me = await prisma.usuario.findUnique({ where: { id: req.userId }, select: { username: true, nomeGuerra: true } });
      notificar(post.usuarioId, 'curtida', `${me.nomeGuerra} curtiu sua publicação`, me.username, postId);
    }
  }
  const total = await prisma.feedLike.count({ where: { postId } });
  emitFeed('post:like', { postId, total });
  res.json({ curtido, total });
});

// Comentar (respeita comentários desativados)
batalhaRouter.post('/feed/:id/comentar', async (req, res) => {
  const postId = Number(req.params.id);
  const texto = String(req.body.texto || '').trim();
  const parentId = req.body.parentId ? Number(req.body.parentId) : null;
  if (!texto) return res.status(400).json({ erro: 'Comentário vazio.' });
  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (!post) return res.status(404).json({ erro: 'Post não encontrado.' });
  if (post.comentariosOff) return res.status(403).json({ erro: 'Comentários desativados nesta publicação.' });
  let parent=null;
  if(parentId){ parent=await prisma.feedComment.findUnique({where:{id:parentId},include:{usuario:{select:{username:true,nomeGuerra:true}}}}); if(!parent||parent.postId!==postId) return res.status(400).json({erro:'Comentário de origem inválido.'}); }
  const c = await prisma.feedComment.create({
    data: { postId, usuarioId: req.userId, texto, parentId },
    include: { usuario: { select: { username: true, nomeGuerra: true } } },
  });
  if(parent && parent.usuarioId!==req.userId) notificar(parent.usuarioId,'resposta',`${c.usuario.nomeGuerra} respondeu ao seu comentário: "${texto.slice(0,40)}"`,c.usuario.username,postId,c.id);
  if (post.usuarioId !== req.userId && (!parent || post.usuarioId!==parent.usuarioId)) notificar(post.usuarioId, parent?'resposta':'comentario', parent?`${c.usuario.nomeGuerra} respondeu um comentário na sua publicação`:`${c.usuario.nomeGuerra} comentou: "${texto.slice(0, 40)}"`, c.usuario.username, postId,c.id);
  const total=await prisma.feedComment.count({where:{postId}});
  emitFeed('post:comentario', { postId,total });
  res.status(201).json(c);
});
batalhaRouter.get('/feed/:id/comentarios', async (req, res) => {
  const postId = Number(req.params.id);
  const c = await prisma.feedComment.findMany({
    where: { postId }, orderBy: { criadoEm: 'asc' },
    include: { usuario: { select: { username: true, nomeGuerra: true, fotoUrl:true, genero:true } }, likes:{select:{usuarioId:true}} },
  });
  res.json(c);
});

batalhaRouter.post('/comentarios/:id/like',async(req,res)=>{
  const commentId=Number(req.params.id);
  const comentario=await prisma.feedComment.findUnique({where:{id:commentId},include:{post:true}});
  if(!comentario) return res.status(404).json({erro:'Comentário não encontrado.'});
  const key={commentId_usuarioId:{commentId,usuarioId:req.userId}};
  const existe=await prisma.feedCommentLike.findUnique({where:key});
  if(existe) await prisma.feedCommentLike.delete({where:key});
  else {
    await prisma.feedCommentLike.create({data:{commentId,usuarioId:req.userId}});
    if(comentario.usuarioId!==req.userId){ const me=await prisma.usuario.findUnique({where:{id:req.userId},select:{username:true,nomeGuerra:true}}); notificar(comentario.usuarioId,'curtida_comentario',`${me.nomeGuerra} curtiu seu comentário`,me.username,comentario.postId,commentId); }
  }
  const total=await prisma.feedCommentLike.count({where:{commentId}});
  emitFeed('post:comentario',{postId:comentario.postId});
  res.json({curtido:!existe,total});
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
    usuario: { id: u.id, username: u.username, nomeGuerra: u.nomeGuerra, bio:u.bio, fotoUrl: u.fotoUrl, genero: u.genero, privado: u.privado, idade: u.idade, pesoKg: u.pesoKg, alturaCm: u.alturaCm, xp: u.xp, patente: rankOf(u.xp).id, patenteNome: rankOf(u.xp).name, recordes: null },
    seguidores, seguindo, isEu, isSeguindo: !!sigoEu, euBloqueei: !!blkEu, meBloqueou, podeVer: podeVer && !meBloqueou, posts,
  });
});

// ---- Listas sociais do perfil (seguidores / seguindo) ----
batalhaRouter.get('/perfil/:username/:lista(seguidores|seguindo)', async (req, res) => {
  const alvo = await prisma.usuario.findUnique({ where: { username: String(req.params.username).toLowerCase() } });
  if (!alvo) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  const isEu = alvo.id === req.userId;
  const [sigoAlvo, bloqueioEu, bloqueioAlvo] = await Promise.all([
    prisma.follow.findUnique({ where: { seguidorId_seguidoId: { seguidorId: req.userId, seguidoId: alvo.id } } }),
    prisma.block.findUnique({ where: { usuarioId_bloqueadoId: { usuarioId: req.userId, bloqueadoId: alvo.id } } }),
    prisma.block.findUnique({ where: { usuarioId_bloqueadoId: { usuarioId: alvo.id, bloqueadoId: req.userId } } }),
  ]);
  if (bloqueioEu || bloqueioAlvo || (alvo.privado && !isEu && !sigoAlvo)) return res.status(403).json({ erro: 'Lista privada.' });
  const follows = req.params.lista === 'seguidores'
    ? await prisma.follow.findMany({ where: { seguidoId: alvo.id }, orderBy: { criadoEm: 'desc' }, select: { seguidorId: true } })
    : await prisma.follow.findMany({ where: { seguidorId: alvo.id }, orderBy: { criadoEm: 'desc' }, select: { seguidoId: true } });
  const ids = follows.map(f => req.params.lista === 'seguidores' ? f.seguidorId : f.seguidoId);
  const usuarios = await prisma.usuario.findMany({ where: { id: { in: ids } }, select: pubSel });
  const porId = new Map(usuarios.map(u => [u.id, u]));
  const meusFollows = new Set((await prisma.follow.findMany({ where: { seguidorId: req.userId, seguidoId: { in: ids } }, select: { seguidoId: true } })).map(f => f.seguidoId));
  const bloqueados = await contextoSocial(req.userId);
  res.json(ids.map(id => porId.get(id)).filter(u => u && !bloqueados.bloqueados.has(u.id)).map(u => ({
    ...u, patente: rankOf(u.xp).id, isEu: u.id === req.userId, isSeguindo: meusFollows.has(u.id),
  })));
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
