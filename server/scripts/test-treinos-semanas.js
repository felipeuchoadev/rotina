import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../../app/disciplina-v3.html',import.meta.url),'utf8');

assert.match(html,/function planoTreinoDaSemana\(i,criar=false\)/);
assert.match(html,/w\.template=clonarPlanoTreino\(S\.treinoTemplate\)/);
assert.match(html,/if\(!edit&&!podeExecutarDia/);
assert.match(html,/treinoSemanaSel=i; treinoDiaSel='seg'/);
assert.match(html,/save\('treino:weeks'\)/);
assert.match(html,/planoTreinoAtual\(dia\)/);
console.log('TREINOS_SEMANAS_TEST=OK');
