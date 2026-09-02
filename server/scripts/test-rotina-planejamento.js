import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../../app/disciplina-v3.html',import.meta.url),'utf8');
const sRegra=html.indexOf('function chaveAtividadeRotina');
const eRegra=html.indexOf('function campoHorario',sRegra);
const sOrdem=html.indexOf('function ordenarAtividadesRotina');
const eOrdem=html.indexOf('function atualizaRotinaHist',sOrdem);
assert.ok(sRegra>=0&&eRegra>sRegra&&sOrdem>=0&&eOrdem>sOrdem,'Funções da rotina não encontradas');

const api=new Function('todayISO','brasiliaNow','rotCalY','rotCalM',`${html.slice(sRegra,eRegra)};${html.slice(sOrdem,eOrdem)};return {chaveAtividadeRotina,diasRegraRotina,ordenarAtividadesRotina};`)(()=> '2026-09-01',()=>new Date('2026-09-01T12:00:00'),2026,8);
assert.deepEqual(api.diasRegraRotina([],'semanaMes',1,7),['2026-09-07','2026-09-14','2026-09-21','2026-09-28']);
assert.deepEqual(api.diasRegraRotina([],'proximos',1,3),['2026-09-01','2026-09-02','2026-09-03']);
assert.deepEqual(api.diasRegraRotina(['2026-08-31','2026-09-02','2026-09-02'],'selecionados'),['2026-09-02']);
assert.equal(api.chaveAtividadeRotina({nome:' Ler ',hora:''}),api.chaveAtividadeRotina({nome:'ler',hora:''}));
assert.deepEqual(api.ordenarAtividadesRotina([{id:'a',hora:'',ordemLivre:2},{id:'b',hora:'08:00'},{id:'c',hora:'',ordemLivre:0}]).map(x=>x.id),['b','c','a']);
assert.match(html,/Adicionar outra atividade/);
assert.match(html,/Todas as… deste mês/);
assert.match(html,/data-rot-drag/);
assert.match(html,/touch-action:none/);
assert.match(html,/function ativarGestoMenu/);
assert.match(html,/e\.clientX>28/);
assert.match(html,/Onde aplicar esta edição\?/);
assert.match(html,/Todos os \$\{ocorrencias\.length\} dias/);
assert.match(html,/serieId/);
[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(Boolean).forEach((codigo,i)=>new Function(`${codigo}\n//# sourceURL=inline-${i}.js`));
console.log('ROTINA_PLANEJAMENTO_TEST=OK');
