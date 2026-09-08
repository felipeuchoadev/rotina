import assert from 'node:assert/strict';
import { calcularEventosXp, penalidadeInatividadePorPatente } from '../src/lib/xp-ledger.js';

const dia='2026-09-02';
const rotinaAntes={ [dia]:[{id:'r1',nome:'Ler',hora:'08:00',done:false}] };
const rotinaFeita={ [dia]:[{id:'r1',nome:'Ler',hora:'08:00',done:true,updatedAt:1_788_342_400_000}] };
const ganhoRotina=calcularEventosXp('rotina:dias',rotinaAntes,rotinaFeita);
assert.equal(ganhoRotina.length,1);
assert.equal(ganhoRotina[0].pontos,10);
assert.match(ganhoRotina[0].descricao,/Ler \(08:00\)/);
const perdaRotina=calcularEventosXp('rotina:dias',rotinaFeita,rotinaAntes);
assert.equal(perdaRotina[0].pontos,-10);

const estudo=calcularEventosXp('estudo:logs',[],[{materia:'Português',ativoMs:120_000,conteudos:['c1','c1']}]);
assert.deepEqual(estudo.map(x=>x.pontos),[4,40], 'tempo e conteúdo devem gerar lançamentos separados e sem duplicar conteúdo');
const treino=calcularEventosXp('treino:logs',[],[{nome:'Corrida',ativoMs:120_000}]);
assert.deepEqual(treino.map(x=>x.pontos),[2]);
assert.equal(calcularEventosXp('treino:logs',[],[{nome:'Curto',ativoMs:59_999}]).length,0);

const aguaAntes={ [dia]:2499 }, aguaMeta={ [dia]:2500 };
assert.equal(calcularEventosXp('alim:agua',aguaAntes,aguaMeta,{metaAgua:2500})[0].pontos,15);
assert.equal(calcularEventosXp('alim:agua',aguaMeta,aguaAntes,{metaAgua:2500})[0].pontos,-15);
assert.equal(calcularEventosXp('alim:agua',aguaMeta,{[dia]:3000},{metaAgua:2500}).length,0);
assert.deepEqual([0,8000,40000,150000].map(penalidadeInatividadePorPatente),[70,100,150,250]);

console.log('XP_LEDGER_TEST=OK');
