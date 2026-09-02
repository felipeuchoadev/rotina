import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';
import { emitToUser, emitRanking } from '../realtime.js';
import { calcularExtratoXp } from '../lib/xp-ledger.js';

// Armazenamento chave-valor por usuário (dados pessoais do app).
export const stateRouter = Router();
stateRouter.use(exigirAuth);

function mergeRotinaDias(atual, recebido) {
  if (!atual || typeof atual !== 'object' || !recebido || typeof recebido !== 'object') return recebido;
  const out = { ...recebido };
  for (const [iso, listaNova] of Object.entries(recebido)) {
    if (!Array.isArray(listaNova)) continue;
    const antigos = new Map((Array.isArray(atual[iso]) ? atual[iso] : []).map(a => [a.id, a]));
    out[iso] = listaNova.map(novo => {
      const velho = antigos.get(novo.id);
      return velho && Number(velho.updatedAt || 0) > Number(novo.updatedAt || 0) ? velho : novo;
    });
  }
  return out;
}

const hojeBrasilia = () => new Intl.DateTimeFormat('en-CA', {
  timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit',
}).format(new Date());

// Dados antigos continuam legíveis, mas uma gravação nova só pode declarar
// execução no dia corrente. Isso impede adulteração por outro cliente/API.
function protegerExecucaoPorData(chave, atual, recebido) {
  const hoje=hojeBrasilia();
  if (chave==='treino:logs'||chave==='estudo:logs') {
    const antigos=Array.isArray(atual)?atual:[];
    const permitidos=Array.isArray(recebido)?recebido:[];
    return permitidos.filter(log=>log?.dateISO===hoje||antigos.some(a=>JSON.stringify(a)===JSON.stringify(log)));
  }
  if (chave==='alim:semana' && recebido && typeof recebido==='object') {
    const out=structuredClone(recebido);
    for (const [dia, refs] of Object.entries(out)) {
      if (!Array.isArray(refs)) continue;
      const antigos=new Map((Array.isArray(atual?.[dia])?atual[dia]:[]).map(r=>[r.id,r]));
      refs.forEach(r=>{ if(r?.done&&r.done!==hoje) r.done=antigos.get(r.id)?.done||null; });
    }
    return out;
  }
  if (chave==='alim:agua' && recebido && typeof recebido==='object') {
    const out={};
    const antigo=atual&&typeof atual==='object'?atual:{};
    for (const [dia, valor] of Object.entries(recebido)) {
      if (dia===hoje) out[dia]=valor;
      else if (Object.prototype.hasOwnProperty.call(antigo,dia)) out[dia]=antigo[dia];
    }
    for (const [dia, valor] of Object.entries(antigo)) if (dia!==hoje) out[dia]=valor;
    return out;
  }
  if (chave==='alim:pesos' && Array.isArray(recebido)) {
    const antigos=Array.isArray(atual)?atual:[];
    return recebido.filter(reg=>reg?.dateISO===hoje||antigos.some(a=>JSON.stringify(a)===JSON.stringify(reg)));
  }
  if (chave==='treino:weeks' && Array.isArray(recebido)) {
    const antigos=new Map((Array.isArray(atual)?atual:[]).map(w=>[w.id,w]));
    const ordem=['seg','ter','qua','qui','sex','sab','dom'];
    return structuredClone(recebido).map(semana=>{
      const exec=semana?.exec&&typeof semana.exec==='object'?semana.exec:{};
      const execAntigo=antigos.get(semana.id)?.exec||{};
      for (const [dia, valor] of Object.entries(exec)) {
        const idx=ordem.indexOf(dia), base=new Date(`${semana.startISO}T12:00:00Z`);
        if (idx<0||Number.isNaN(base.getTime())) { delete exec[dia]; continue; }
        base.setUTCDate(base.getUTCDate()+idx);
        const iso=base.toISOString().slice(0,10);
        if (iso!==hoje) {
          if (Object.prototype.hasOwnProperty.call(execAntigo,dia)) exec[dia]=execAntigo[dia];
          else delete exec[dia];
        }
      }
      for (const [dia, valor] of Object.entries(execAntigo)) if (!Object.prototype.hasOwnProperty.call(exec,dia)) exec[dia]=valor;
      semana.exec=exec;
      return semana;
    });
  }
  if (chave==='rotina:dias' && recebido && typeof recebido==='object') {
    const out=structuredClone(recebido);
    for (const [iso, atividades] of Object.entries(out)) {
      if (!Array.isArray(atividades)||iso===hoje) continue;
      const antigos=new Map((Array.isArray(atual?.[iso])?atual[iso]:[]).map(a=>[a.id,a]));
      atividades.forEach(a=>{ a.done=!!antigos.get(a.id)?.done; });
    }
    return out;
  }
  return recebido;
}

async function recalcularXp(usuarioId) {
  const rows = await prisma.userState.findMany({
    where: { usuarioId, chave: { in: ['treino:logs', 'estudo:logs', 'estudo:materias', 'alim:agua', 'rotina:dias', 'xp:bonus'] } },
  });
  const s = Object.fromEntries(rows.map(r => [r.chave, r.valor]));
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { metaAgua: true } });
  const extrato = calcularExtratoXp(s, usuario, hoje);
  const xpFinal = extrato.total;
  await prisma.usuario.update({ where: { id: usuarioId }, data: { xp: xpFinal } });
  emitToUser(usuarioId, 'profile:changed', { usuario: { xp: xpFinal }, src: null });
  emitRanking();
  return xpFinal;
}

async function extratoXpDoUsuario(usuarioId) {
  const [rows, usuario] = await Promise.all([
    prisma.userState.findMany({ where: { usuarioId, chave: { in: ['treino:logs', 'estudo:logs', 'estudo:materias', 'alim:agua', 'rotina:dias', 'xp:bonus'] } } }),
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { metaAgua: true, xp: true } }),
  ]);
  const estados = Object.fromEntries(rows.map(r => [r.chave, r.valor]));
  const hoje = hojeBrasilia();
  const extrato = calcularExtratoXp(estados, usuario, hoje);
  if (usuario && usuario.xp !== extrato.total) {
    await prisma.usuario.update({ where: { id: usuarioId }, data: { xp: extrato.total } });
    emitToUser(usuarioId, 'profile:changed', { usuario: { xp: extrato.total }, src: null });
    emitRanking();
  }
  return extrato;
}

// Todos os blobs do usuário de uma vez → { chave: valor, ... }
stateRouter.get('/', async (req, res) => {
  const rows = await prisma.userState.findMany({ where: { usuarioId: req.userId } });
  const out = {};
  for (const r of rows) out[r.chave] = r.valor;
  res.json(out);
});

stateRouter.get('/historico/lista', async (req,res)=>{
  const chaves=String(req.query.chaves||'').split(',').map(x=>x.trim()).filter(Boolean);
  const limite=Math.min(1000,Math.max(50,Number(req.query.limite)||500));
  const rows=await prisma.stateHistory.findMany({where:{usuarioId:req.userId,...(chaves.length?{chave:{in:chaves}}:{})},orderBy:{criadoEm:'desc'},take:limite});
  res.json(rows.map(r=>({id:String(r.id),chave:r.chave,valor:r.valor,criadoEm:r.criadoEm})));
});

stateRouter.get('/xp/extrato', async (req, res) => {
  res.json(await extratoXpDoUsuario(req.userId));
});

// Um blob específico
stateRouter.get('/:chave', async (req, res) => {
  const r = await prisma.userState.findUnique({
    where: { usuarioId_chave: { usuarioId: req.userId, chave: req.params.chave } },
  });
  res.json(r ? r.valor : null);
});

// Grava (upsert) um blob
stateRouter.put('/:chave', async (req, res) => {
  if(req.params.chave==='xp:bonus') return res.status(403).json({erro:'Ajuste de XP é reservado ao sistema.'});
  // Depois de uma limpeza administrativa, somente clientes que já receberam o
  // marcador novo podem gravar. Impede abas/aparelhos antigos de restaurarem
  // silenciosamente dados que acabaram de ser apagados.
  if(req.params.chave!=='system:reset'){
    const reset=await prisma.userState.findUnique({where:{usuarioId_chave:{usuarioId:req.userId,chave:'system:reset'}}});
    const resetId=reset?.valor?.id;
    if(resetId && String(req.body?.resetId||'')!==String(resetId)){
      return res.status(409).json({erro:'A conta foi reiniciada. Atualizando os dados deste aparelho.',reset:true,resetId:String(resetId)});
    }
  }
  let valor = req.body?.valor;
  const versaoRecebida = BigInt(Math.max(0, Number(req.body?.versao || Date.now())));
  const atual = await prisma.userState.findUnique({ where: { usuarioId_chave: { usuarioId: req.userId, chave: req.params.chave } } });
  if (atual && atual.versao > versaoRecebida) return res.json({ ok: true, valor: atual.valor, versao: Number(atual.versao), ignorada: true });
  if (req.params.chave === 'rotina:dias') {
    valor = mergeRotinaDias(atual?.valor, valor);
  }
  valor = protegerExecucaoPorData(req.params.chave, atual?.valor, valor);
  await prisma.userState.upsert({
    where: { usuarioId_chave: { usuarioId: req.userId, chave: req.params.chave } },
    update: { valor, versao: versaoRecebida },
    create: { usuarioId: req.userId, chave: req.params.chave, valor, versao: versaoRecebida },
  });
  if(!atual||JSON.stringify(atual.valor)!==JSON.stringify(valor)){
    await prisma.stateHistory.create({data:{usuarioId:req.userId,chave:req.params.chave,valor}}).catch(()=>{});
  }
  const xpAtual=['treino:logs','estudo:logs','alim:agua','rotina:dias'].includes(req.params.chave) ? await recalcularXp(req.userId) : null;
  // sync ao vivo: avisa os OUTROS aparelhos do mesmo usuário (src = quem escreveu, pra não ecoar nele)
  emitToUser(req.userId, 'state:changed', { chave: req.params.chave, valor, versao:Number(versaoRecebida), src: req.body?.clientId || null });
  res.json({ ok: true, valor, versao:Number(versaoRecebida), ...(xpAtual!==null?{xp:xpAtual}:{}) });
});

stateRouter.delete('/:chave', async (req, res) => {
  if (req.params.chave === 'xp:bonus') return res.status(403).json({ erro: 'Ajuste de XP é reservado ao sistema.' });
  const anterior=await prisma.userState.findUnique({where:{usuarioId_chave:{usuarioId:req.userId,chave:req.params.chave}}});
  await prisma.userState.deleteMany({ where: { usuarioId: req.userId, chave: req.params.chave } });
  if(anterior)await prisma.stateHistory.create({data:{usuarioId:req.userId,chave:req.params.chave,valor:null}}).catch(()=>{});
  if (['treino:logs', 'estudo:logs', 'alim:agua', 'rotina:dias'].includes(req.params.chave)) await recalcularXp(req.userId);
  emitToUser(req.userId, 'state:changed', { chave: req.params.chave, valor: null, src: req.query.src || null });
  res.status(204).end();
});

export default stateRouter;
