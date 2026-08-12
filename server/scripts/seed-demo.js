import { prisma } from '../src/lib/db.js';
import { hashSenha } from '../src/lib/auth.js';

const email = process.env.DEMO_EMAIL;
const senha = process.env.DEMO_PASSWORD;
if (!email || !senha) throw new Error('Defina DEMO_EMAIL e DEMO_PASSWORD para gerar a conta de demonstração.');
const hoje = new Date();
const iso = d => d.toISOString().slice(0,10);
const diasAtras = n => { const d=new Date(hoje); d.setUTCDate(d.getUTCDate()-n); return iso(d); };
const monday = d => { const x=new Date(d); const wd=x.getUTCDay()||7; x.setUTCDate(x.getUTCDate()-wd+1); return iso(x); };
const vids = [
  'https://redsystems.ddns.net/rotina/uploads/868bcbd3-7a2b-49db-91bd-3763f60abf1c.mp4',
  'https://redsystems.ddns.net/rotina/uploads/a88e06cc-aa56-458d-b463-2c82270ad6e4.mp4',
  'https://redsystems.ddns.net/rotina/uploads/f71ce179-2a84-4dc5-9339-ccb541730b9b.mp4',
];
const DIAS=['seg','ter','qua','qui','sex','sab','dom'];
const hojeIso=iso(hoje), hojeDia=DIAS[(hoje.getUTCDay()+6)%7];
const tpl={seg:[],ter:[],qua:[],qui:[],sex:[],sab:[],dom:[]};
tpl.seg=[{id:'supino',nome:'Supino reto',desc:'4 séries de 8 a 10 repetições. Escápulas firmes, pés no chão e descida controlada.',videoUrl:vids[0]},{id:'remada',nome:'Remada curvada',desc:'4 séries de 10 repetições. Coluna neutra e cotovelos próximos ao corpo.',videoUrl:vids[1]}];
tpl.ter=[{id:'corrida',nome:'Corrida leve',desc:'30 minutos em ritmo confortável, mantendo respiração controlada.',videoUrl:vids[2]}];
tpl.qua=[{id:'agachamento',nome:'Agachamento livre',desc:'4 séries de 8 repetições. Joelhos acompanham a ponta dos pés e tronco firme.',videoUrl:vids[0]},{id:'prancha',nome:'Prancha abdominal',desc:'3 séries de 45 segundos, contraindo abdômen e glúteos.',videoUrl:vids[1]}];
tpl.qui=[{id:'barra',nome:'Barra fixa',desc:'4 séries com técnica limpa. Evite balanço e controle a descida.',videoUrl:vids[2]}];
tpl.sex=[{id:'terra',nome:'Levantamento terra',desc:'4 séries de 6 repetições. Barra próxima às pernas e coluna neutra.',videoUrl:vids[0]}];
tpl.sab=[{id:'mobilidade',nome:'Mobilidade e alongamento',desc:'20 minutos para quadril, tornozelos, ombros e coluna torácica.',videoUrl:vids[1]}];

const materias=[
  {id:'mat',nome:'Matemática',conteudos:[{id:'mat1',nome:'Razão e proporção',done:true,tempoMs:2700000},{id:'mat2',nome:'Porcentagem',done:true,tempoMs:2400000},{id:'mat3',nome:'Equações do 1º grau',done:false,tempoMs:0}]},
  {id:'port',nome:'Português',conteudos:[{id:'por1',nome:'Interpretação textual',done:true,tempoMs:3000000},{id:'por2',nome:'Concordância verbal',done:false,tempoMs:0}]},
  {id:'geo',nome:'Geografia',conteudos:[{id:'geo1',nome:'Geopolítica mundial',done:true,tempoMs:2100000},{id:'geo2',nome:'Climas do Brasil',done:false,tempoMs:0}]},
  {id:'hist',nome:'História',conteudos:[{id:'his1',nome:'Brasil República',done:true,tempoMs:2400000},{id:'his2',nome:'Era Vargas',done:false,tempoMs:0}]},
];
const estudoSemana={seg:['mat','port'],ter:['geo'],qua:['mat','hist'],qui:['port','geo'],sex:['mat','hist'],sab:['port'],dom:[]};
const refeicoes=d=>[
  {id:`${d}-cafe`,nome:'Café da manhã',desc:'Ovos mexidos, aveia, banana e café sem açúcar',done:d===hojeDia?hojeIso:null},
  {id:`${d}-almoco`,nome:'Almoço',desc:'Arroz, feijão, frango grelhado e salada variada',done:d===hojeDia?hojeIso:null},
  {id:`${d}-lanche`,nome:'Lanche',desc:'Iogurte natural com frutas e castanhas',done:null},
  {id:`${d}-jantar`,nome:'Jantar',desc:'Batata-doce, carne magra e legumes',done:null},
];
const alimSemana=Object.fromEntries(DIAS.map(d=>[d,refeicoes(d)]));
const treinoLogs=[];
for(let n=28;n>=0;n-=2){ const ex=['supino','corrida','agachamento','barra','terra'][n%5]; treinoLogs.push({exId:ex,nome:ex[0].toUpperCase()+ex.slice(1),dia:DIAS[(new Date(diasAtras(n)+'T12:00:00Z').getUTCDay()+6)%7],dateISO:diasAtras(n),ativoMs:(35+n%20)*60000,pausaMs:5*60000,legenda:'Sessão demonstrativa concluída com técnica e constância.'}); }
const estudoLogs=[];
for(let n=24;n>=0;n-=3){ const m=materias[(n/3)%materias.length|0]; estudoLogs.push({materiaId:m.id,nome:m.nome,dateISO:diasAtras(n),ativoMs:(40+n%25)*60000,pausaMs:4*60000,conteudos:[m.conteudos[0].id]}); }
const rotinaDias={};
for(let n=-4;n<=12;n++){ const d=new Date(hoje); d.setUTCDate(d.getUTCDate()+n); const k=iso(d), passado=n<0; rotinaDias[k]=[
  {id:`${k}-acordar`,nome:'Acordar e arrumar a cama',hora:'06:00',done:passado||n===0,updatedAt:Date.now()},
  {id:`${k}-estudar`,nome:'Bloco de estudos',hora:'08:00',done:passado||n===0,updatedAt:Date.now()},
  {id:`${k}-treinar`,nome:'Treino do dia',hora:'18:00',done:passado,updatedAt:Date.now()},
  {id:`${k}-ler`,nome:'Leitura por 20 minutos',hora:'21:00',done:passado,updatedAt:Date.now()},
]; }
const pesos=Array.from({length:10},(_,i)=>({dateISO:diasAtras((9-i)*7),peso:+(84.8-i*.42+(i%2?.15:0)).toFixed(2)}));
const hist=Array.from({length:8},(_,i)=>({weekStartISO:diasAtras((8-i)*7),total:20,bom:14+i%5,ruim:2+(i%3),neutro:4,percentual:70+i%5*3,refeicoes:[{nome:'Almoço',desc:'Prato equilibrado com proteína, carboidrato e vegetais',qualidade:'bom'}]}));
const recordacoes=[
  {id:'rec1',tipo:'treino',url:vids[0],midiaTipo:'video',texto:'Demonstração: execução controlada do exercício',dateISO:hojeIso,at:new Date().toISOString()},
  {id:'rec2',tipo:'treino',url:vids[1],midiaTipo:'video',texto:'Treino de força concluído',dateISO:hojeIso,at:new Date(Date.now()-3600000).toISOString()},
  {id:'rec3',tipo:'estudo',url:vids[2],midiaTipo:'video',texto:'Resumo da sessão de estudos',dateISO:hojeIso,at:new Date(Date.now()-7200000).toISOString()},
];
const states={
  'treino:tpl':tpl,'treino:weeks':[{id:'semana-demo',startISO:monday(hoje),exec:{}}], 'treino:logs':treinoLogs,
  'treino:recordes':[{id:'r1',nome:'Corrida 5 km',valor:'24:30',unidade:'min',historico:[{dateISO:diasAtras(30),valor:'27:10'},{dateISO:diasAtras(1),valor:'24:30'}]},{id:'r2',nome:'Flexões',valor:'48',unidade:'repetições',historico:[{dateISO:diasAtras(20),valor:'35'},{dateISO:hojeIso,valor:'48'}]}],
  'estudo:materias':materias,'estudo:semana':estudoSemana,'estudo:logs':estudoLogs,
  'alim:semana':alimSemana,'alim:pesos':pesos,'alim:agua':Object.fromEntries(Array.from({length:14},(_,i)=>[diasAtras(i),i===0?2100:2800+(i%4)*250])),'alim:hist':{ref:monday(hoje),hist},
  'rotina:dias':rotinaDias,'rotina:hist':{},'rotina:plano':{dias:{},padrao:''},
  'config':{editMode:false,tryHard:false,notif:false},
  'datas':[{id:'d1',nome:'Prova importante',data:diasAtras(-14),repete:'nao'},{id:'d2',nome:'Aniversário da mãe',data:'2026-09-18',repete:'ano'}],
  'recordacoes':recordacoes,
};

await prisma.usuario.deleteMany();
const usuario=await prisma.usuario.create({data:{email,senhaHash:await hashSenha(senha),username:'felipe_demo',nomeGuerra:'FELIPE DEMO',idade:18,dataNasc:new Date('2007-08-22T12:00:00Z'),genero:'m',secPergunta:'Qual é o seu time de coração?',secRespHash:await hashSenha('Flamengo'),pesoKg:81.02,alturaCm:176,metaAgua:2836,tema:'red',xp:11291}});
await prisma.userState.createMany({data:Object.entries(states).map(([chave,valor])=>({usuarioId:usuario.id,chave,valor}))});
const posts=[
  {texto:'Treino de peito concluído. Técnica primeiro, carga depois. 💪',midiaUrl:vids[0],midiaTipo:'video',tipo:'treino',criadoEm:new Date(Date.now()-20*60000)},
  {texto:'Demonstração de execução para quem está começando. Movimento controlado e sem pressa.',midiaUrl:vids[1],midiaTipo:'video',tipo:'treino',criadoEm:new Date(Date.now()-3*3600000)},
  {texto:'Resumo do dia: treino, 2 blocos de estudo, alimentação equilibrada e 2.100 ml de água. Constância vence motivação.',tipo:'manual',criadoEm:new Date(Date.now()-26*3600000)},
  {texto:'Meta da semana: melhorar o tempo nos 5 km e concluir Equações do 1º grau. 🎯',midiaUrl:vids[2],midiaTipo:'video',tipo:'manual',criadoEm:new Date(Date.now()-52*3600000)},
];
for(const p of posts) await prisma.feedPost.create({data:{...p,usuarioId:usuario.id}});
console.log(JSON.stringify({ok:true,usuario:usuario.username,states:Object.keys(states).length,posts:posts.length,treinoLogs:treinoLogs.length,estudoLogs:estudoLogs.length}));
await prisma.$disconnect();
