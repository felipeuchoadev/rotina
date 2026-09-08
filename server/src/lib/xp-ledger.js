import crypto from 'node:crypto';
import { prisma } from './db.js';
import { rankOf } from './xp.js';

const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,24);
const arr=v=>Array.isArray(v)?v:[];
const minutos=v=>{const ms=Number(v);return Number.isFinite(ms)&&ms>=60000&&ms<=86400000?Math.floor(ms/60000):0;};

export async function garantirExtratoXp(usuarioId){
  if(await prisma.xpLancamento.findFirst({where:{usuarioId},select:{id:true}}))return;
  const u=await prisma.usuario.findUnique({where:{id:usuarioId},select:{xp:true}});if(!u)return;
  await prisma.xpLancamento.create({data:{usuarioId,eventoId:'saldo-inicial-v1',tipo:'ajustes',descricao:'Saldo preservado antes do extrato fiel',pontos:u.xp}}).catch(e=>{if(e?.code!=='P2002')throw e;});
}

const isoBrasilia=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const diaAnterior=iso=>{const d=new Date(`${iso}T12:00:00-03:00`);d.setDate(d.getDate()-1);return isoBrasilia(d)};
const diaSeguinte=iso=>{const d=new Date(`${iso}T12:00:00-03:00`);d.setDate(d.getDate()+1);return isoBrasilia(d)};
export function penalidadeInatividadePorPatente(xp){return ({recruta:70,soldado:100,cabo:150,'3sgt':250})[rankOf(Math.max(0,Number(xp)||0)).id]||70;}

// Materializa cada dia sem ganho real em uma única linha imutável. A data de
// início evita cobrar períodos anteriores à entrada pública desta regra.
export async function aplicarPenalidadesInatividade(usuarioId,agora=new Date()){
  await garantirExtratoXp(usuarioId);
  const usuario=await prisma.usuario.findUnique({where:{id:usuarioId},select:{xp:true,criadoEm:true,isAdmin:true,bloqueado:true}});
  if(!usuario||usuario.isAdmin||usuario.bloqueado)return Number(usuario?.xp||0);
  const hoje=isoBrasilia(agora),ontem=diaAnterior(hoje),inicioRegra=new Date('2026-09-05T00:00:00-03:00');
  let dia=isoBrasilia(usuario.criadoEm>inicioRegra?usuario.criadoEm:inicioRegra);
  const rows=await prisma.xpLancamento.findMany({where:{usuarioId,ocorridoEm:{gte:new Date(`${dia}T00:00:00-03:00`)}},select:{eventoId:true,pontos:true,ocorridoEm:true},orderBy:{ocorridoEm:'asc'}});
  const ganhos=new Set(rows.filter(r=>r.pontos>0&&r.eventoId!=='saldo-inicial-v1').map(r=>isoBrasilia(r.ocorridoEm)));
  const cobrados=new Set(rows.filter(r=>r.eventoId.startsWith('inatividade:')).map(r=>r.eventoId.slice(11)));
  let saldo=Number((await prisma.xpLancamento.aggregate({where:{usuarioId},_sum:{pontos:true}}))._sum.pontos||0);
  while(dia<=ontem){
    if(!ganhos.has(dia)&&!cobrados.has(dia)&&saldo>0){const pontos=-Math.min(saldo,penalidadeInatividadePorPatente(saldo));await prisma.xpLancamento.create({data:{usuarioId,eventoId:`inatividade:${dia}`,tipo:'perdas',descricao:`Dia sem nenhuma atividade registrada (${dia.split('-').reverse().join('/')})`,pontos,ocorridoEm:new Date(`${dia}T23:59:59-03:00`)}}).catch(e=>{if(e?.code!=='P2002')throw e;});saldo+=pontos;}
    dia=diaSeguinte(dia);
  }
  saldo=Math.max(0,Number((await prisma.xpLancamento.aggregate({where:{usuarioId},_sum:{pontos:true}}))._sum.pontos||0));if(saldo!==usuario.xp)await prisma.usuario.update({where:{id:usuarioId},data:{xp:saldo}});return saldo;
}

function eventos(chave,anterior,atual,perfil){
  const out=[],agora=new Date();
  if(chave==='rotina:dias'){
    const a=anterior&&typeof anterior==='object'?anterior:{},n=atual&&typeof atual==='object'?atual:{};
    for(const [dia,atividades] of Object.entries(n)){const velhas=new Map(arr(a[dia]).map(x=>[String(x?.id),x]));for(const x of arr(atividades)){const v=velhas.get(String(x?.id));if(!v||!!v.done===!!x.done)continue;const at=Number(x.updatedAt)||Date.now();out.push({eventoId:`rotina:${dia}:${x.id}:${x.done?'feito':'desfeito'}:${at}`,tipo:'rotina',descricao:`Rotina ${x.done?'cumprida':'desmarcada'}: ${x.nome||'atividade'}${x.hora?` (${x.hora})`:''}`,pontos:x.done?10:-10,ocorridoEm:new Date(at)});}}
  }
  if(chave==='treino:logs'||chave==='estudo:logs'){
    const antigos=new Set(arr(anterior).map(hash));for(const log of arr(atual)){const h=hash(log);if(antigos.has(h))continue;const m=minutos(log?.ativoMs),at=Number(log?.updatedAt)?new Date(Number(log.updatedAt)):agora,tipo=chave.startsWith('treino')?'treino':'estudo';if(m)out.push({eventoId:`${chave}:${h}:tempo`,tipo,descricao:tipo==='treino'?`Treino: ${log.nome||'sessão'} · ${m} min ativo(s)`:`Estudo: ${log.materia||'matéria'} · ${m} min × 2 XP`,pontos:tipo==='treino'?m:m*2,ocorridoEm:at});if(tipo==='estudo')for(const c of new Set(arr(log?.conteudos).map(String)))out.push({eventoId:`${chave}:${h}:conteudo:${c}`,tipo,descricao:`Conteúdo concluído: ${c}`,pontos:40,ocorridoEm:at});}
  }
  if(chave==='alim:agua'){
    const meta=Math.max(250,Number(perfil?.metaAgua||2500)),a=anterior&&typeof anterior==='object'?anterior:{},n=atual&&typeof atual==='object'?atual:{};for(const [dia,v] of Object.entries(n)){const antes=Number(a[dia])>=meta,depois=Number(v)>=meta;if(antes===depois)continue;out.push({eventoId:`agua:${dia}:${depois?'atingiu':'desfez'}:${Date.now()}`,tipo:'agua',descricao:`Meta de água ${depois?'atingida':'desfeita'}: ${Number(v).toLocaleString('pt-BR')} de ${meta.toLocaleString('pt-BR')} ml`,pontos:depois?15:-15,ocorridoEm:agora});}
  }
  return out;
}

// Exportação pura para manter as regras de pontuação testáveis sem tocar no banco.
export function calcularEventosXp(chave,anterior,atual,perfil={}){
  return eventos(chave,anterior,atual,perfil);
}

export async function registrarMudancaXp(usuarioId,chave,anterior,atual){
  await garantirExtratoXp(usuarioId);const perfil=await prisma.usuario.findUnique({where:{id:usuarioId},select:{metaAgua:true}});
  for(const e of eventos(chave,anterior,atual,perfil))await prisma.xpLancamento.create({data:{usuarioId,...e}}).catch(err=>{if(err?.code!=='P2002')throw err;});
  const s=await prisma.xpLancamento.aggregate({where:{usuarioId},_sum:{pontos:true}}),total=Math.max(0,Number(s._sum.pontos||0));await prisma.usuario.update({where:{id:usuarioId},data:{xp:total}});return total;
}

export async function obterExtratoXp(usuarioId){
  await aplicarPenalidadesInatividade(usuarioId);const [u,rows]=await Promise.all([prisma.usuario.findUnique({where:{id:usuarioId},select:{xp:true}}),prisma.xpLancamento.findMany({where:{usuarioId},orderBy:[{ocorridoEm:'desc'},{id:'desc'}],take:1000})]);
  const itens=rows.map(r=>({id:String(r.id),tipo:r.tipo,dateISO:r.ocorridoEm.toISOString().slice(0,10),at:r.ocorridoEm.getTime(),criadoEm:r.criadoEm.getTime(),xp:r.pontos,txt:r.descricao})),ganhos=itens.filter(i=>i.xp>0).reduce((s,i)=>s+i.xp,0),perdas=itens.filter(i=>i.xp<0).reduce((s,i)=>s+i.xp,0);return{total:Number(u?.xp||0),ganhos,perdas,itens};
}
