import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { exigirAuth, hashSenha, assinarTokenSuporte, assinarToken } from '../lib/auth.js';
import { publico } from './auth.js';
import { emitFeed, emitToUser } from '../realtime.js';
import { validarEmailPadrao } from '../lib/email.js';

export const adminRouter = Router();
adminRouter.use(exigirAuth);
adminRouter.post('/retornar-suporte',async(req,res)=>{
  if(!req.supportAdminId)return res.status(403).json({erro:'Esta sessão não está em modo suporte.'});
  const admin=await prisma.usuario.findUnique({where:{id:req.supportAdminId}});
  if(!admin?.isAdmin||admin.bloqueado)return res.status(403).json({erro:'Administrador indisponível.'});
  res.json({token:assinarToken(admin)});
});
adminRouter.use(async (req, res, next) => {
  const admin = await prisma.usuario.findUnique({ where: { id: req.userId }, select: { isAdmin: true, bloqueado: true } });
  if (!admin?.isAdmin || admin.bloqueado) return res.status(403).json({ erro: 'Acesso exclusivo do proprietário.' });
  res.set('Cache-Control','no-store');next();
});

const auditar = (adminId, alvoId, acao, detalhes = null) => prisma.adminAudit.create({ data: { adminId, alvoId, acao, detalhes } });

adminRouter.get('/resumo', async (_req, res) => {
  const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const inicioHoje=new Date(hoje+'T03:00:00.000Z'),fimHoje=new Date(inicioHoje.getTime()+86400000);
  const periodoHoje={gte:inicioHoje,lt:fimHoje};
  const [usuarios, bloqueados, avisos, posts, mensagens, estados, avisosHoje, mensagensHoje, postsHoje] = await Promise.all([
    prisma.usuario.count({ where:{isAdmin:false} }), prisma.usuario.count({ where: { bloqueado: true, isAdmin:false } }), prisma.adminAviso.count(),
    prisma.feedPost.count(), prisma.mensagem.count(), prisma.userState.count(), prisma.adminAviso.count({where:{criadoEm:periodoHoje}}), prisma.mensagem.count({where:{criadoEm:periodoHoje}}), prisma.feedPost.count({where:{criadoEm:periodoHoje}}),
  ]);
  res.json({ usuarios, bloqueados, avisos, posts, mensagens, estados, avisosHoje, mensagensHoje, postsHoje, atualizadoEm:new Date().toISOString() });
});

adminRouter.get('/atividade', async (req,res)=>{
  const tipo=String(req.query.tipo||'');
  if(tipo==='posts'){
    const itens=await prisma.feedPost.findMany({orderBy:{criadoEm:'desc'},take:50,select:{id:true,texto:true,tipo:true,privado:true,criadoEm:true,usuario:{select:{nomeGuerra:true,username:true}}}});
    return res.json({tipo,itens});
  }
  if(tipo==='messages'){
    const itens=await prisma.mensagem.findMany({orderBy:{criadoEm:'desc'},take:50,select:{id:true,texto:true,midiaTipo:true,apagadaTodos:true,criadoEm:true,de:{select:{nomeGuerra:true,username:true}},para:{select:{nomeGuerra:true,username:true}}}});
    return res.json({tipo,itens});
  }
  if(tipo==='states'){
    const itens=await prisma.userState.groupBy({by:['chave'],_count:{_all:true},orderBy:{_count:{chave:'desc'}}});
    return res.json({tipo,itens:itens.map(x=>({chave:x.chave,total:x._count._all}))});
  }
  res.status(400).json({erro:'Tipo de atividade inválido.'});
});

adminRouter.get('/usuarios', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limite = Math.min(100, Math.max(10, Number(req.query.limite) || 40));
  const where = q ? { isAdmin:false, OR: [
    { email: { contains: q, mode: 'insensitive' } }, { username: { contains: q, mode: 'insensitive' } },
    { nomeGuerra: { contains: q, mode: 'insensitive' } },
  ] } : { isAdmin:false };
  const usuarios = await prisma.usuario.findMany({ where, orderBy: { criadoEm: 'desc' }, take: limite,
    select: { id:true,email:true,username:true,nomeGuerra:true,fotoUrl:true,genero:true,xp:true,isAdmin:true,bloqueado:true,criadoEm:true,ultimoAcesso:true } });
  res.json({ usuarios });
});

adminRouter.get('/usuarios/:id', async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id } });
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  const [states, posts, mensagens, auditoria] = await Promise.all([
    prisma.userState.findMany({ where:{usuarioId:usuario.id}, select:{chave:true,versao:true} }),
    prisma.feedPost.count({where:{usuarioId:usuario.id}}),
    prisma.mensagem.count({where:{OR:[{deId:usuario.id},{paraId:usuario.id}]}}),
    prisma.adminAudit.findMany({where:{alvoId:usuario.id},orderBy:{criadoEm:'desc'},take:20}),
  ]);
  res.json({ usuario: publico(usuario), isAdmin:usuario.isAdmin, bloqueado:usuario.bloqueado,
    resumo:{posts,mensagens,estados:states.map(s=>s.chave)}, auditoria });
});

const editSchema = z.object({
  email:z.string().email().optional(), username:z.string().regex(/^[a-z0-9_]{3,20}$/).optional(),
  nomeGuerra:z.string().trim().min(1).max(40).optional(), genero:z.enum(['m','f']).nullable().optional(),
  dataNasc:z.string().nullable().optional(), pesoKg:z.number().min(1).max(500).optional(),
  alturaCm:z.number().int().min(50).max(260).optional(), metaAgua:z.number().int().min(250).max(20000).optional(),
  tema:z.string().max(30).optional(), privado:z.boolean().optional(), bloqueado:z.boolean().optional(),
});
adminRouter.patch('/usuarios/:id', async (req, res) => {
  const parsed=editSchema.safeParse(req.body); if(!parsed.success)return res.status(400).json({erro:'Dados inválidos.',detalhes:parsed.error.flatten()});
  const d={...parsed.data}; if(d.email)d.email=d.email.toLowerCase().trim(); if(d.username)d.username=d.username.toLowerCase();
  if(d.email){const v=validarEmailPadrao(d.email);if(!v.ok)return res.status(400).json({campo:'email',erro:v.erro,sugestao:v.sugestao||null});}
  if(d.dataNasc!==undefined)d.dataNasc=d.dataNasc?new Date(d.dataNasc):null;
  try{
    const usuario=await prisma.usuario.update({where:{id:req.params.id},data:d});
    await auditar(req.userId,usuario.id,'usuario:editar',{campos:Object.keys(parsed.data)});
    res.json({usuario:publico(usuario),bloqueado:usuario.bloqueado});
  }catch(e){ if(e?.code==='P2002')return res.status(409).json({erro:'E-mail ou username já está em uso.'}); throw e; }
});

adminRouter.post('/usuarios/:id/redefinir-senha', async (req,res)=>{
  const senha=String(req.body.senha||''); if(senha.length<8)return res.status(400).json({erro:'A nova senha precisa ter pelo menos 8 caracteres.'});
  await prisma.usuario.update({where:{id:req.params.id},data:{senhaHash:await hashSenha(senha),resetToken:null,resetExp:null}});
  await auditar(req.userId,req.params.id,'senha:redefinir'); res.json({ok:true});
});

adminRouter.post('/usuarios/:id/entrar-como', async (req,res)=>{
  const usuario=await prisma.usuario.findUnique({where:{id:req.params.id}});
  if(!usuario)return res.status(404).json({erro:'Usuário não encontrado.'});
  if(usuario.isAdmin)return res.status(400).json({erro:'Não é possível iniciar suporte em outra conta administrativa.'});
  if(usuario.bloqueado)return res.status(400).json({erro:'Reative a conta antes de acessá-la.'});
  await auditar(req.userId,usuario.id,'suporte:entrar');
  res.json({token:assinarTokenSuporte(usuario,req.userId),usuario:publico(usuario)});
});

adminRouter.get('/auditoria', async (_req,res)=>{
  const itens=await prisma.adminAudit.findMany({orderBy:{criadoEm:'desc'},take:100});
  const ids=[...new Set(itens.map(i=>i.alvoId).filter(Boolean))];
  const usuarios=ids.length?await prisma.usuario.findMany({where:{id:{in:ids}},select:{id:true,nomeGuerra:true,username:true}}):[];
  const porId=new Map(usuarios.map(u=>[u.id,u]));
  res.json({itens:itens.map(i=>({...i,alvo:porId.get(i.alvoId)||null}))});
});

adminRouter.get('/avisos',async(_req,res)=>{
  const avisos=await prisma.adminAviso.findMany({orderBy:{criadoEm:'desc'},take:50,include:{_count:{select:{dispensas:true}}}});
  const ids=[...new Set(avisos.map(a=>a.destinatarioId).filter(Boolean))];
  const usuarios=ids.length?await prisma.usuario.findMany({where:{id:{in:ids}},select:{id:true,nomeGuerra:true,username:true}}):[];
  const porId=new Map(usuarios.map(u=>[u.id,u]));
  res.json({avisos:avisos.map(a=>({...a,destinatario:porId.get(a.destinatarioId)||null}))});
});

adminRouter.post('/avisos',async(req,res)=>{
  const titulo=String(req.body.titulo||'').trim().slice(0,80),mensagem=String(req.body.mensagem||'').trim().slice(0,1000);
  const destinatarioId=req.body.destinatarioId?String(req.body.destinatarioId):null;
  if(!titulo||!mensagem)return res.status(400).json({erro:'Título e mensagem são obrigatórios.'});
  if(destinatarioId){
    const destino=await prisma.usuario.findUnique({where:{id:destinatarioId},select:{id:true,isAdmin:true}});
    if(!destino)return res.status(404).json({erro:'Destinatário não encontrado.'});
    if(destino.isAdmin)return res.status(400).json({erro:'Avisos são destinados apenas aos usuários.'});
  }
  const aviso=await prisma.adminAviso.create({data:{adminId:req.userId,destinatarioId,titulo,mensagem}});
  await auditar(req.userId,destinatarioId,'aviso:publicar',{avisoId:aviso.id,publico:!destinatarioId});
  if(destinatarioId)emitToUser(destinatarioId,'aviso:novo',{id:aviso.id});else emitFeed('aviso:novo',{id:aviso.id});
  res.status(201).json({aviso});
});

adminRouter.patch('/avisos/:id',async(req,res)=>{
  const id=Number(req.params.id),ativo=!!req.body.ativo;
  const aviso=await prisma.adminAviso.update({where:{id},data:{ativo}});
  await auditar(req.userId,aviso.destinatarioId,'aviso:estado',{avisoId:id,ativo});res.json({aviso});
});

export default adminRouter;
