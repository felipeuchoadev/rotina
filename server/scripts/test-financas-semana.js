import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../app/disciplina-v3.html',import.meta.url),'utf8');
assert.match(html,/financas:dados/);
assert.match(html,/function renderFinancas\(\)/);
assert.match(html,/Foi parcelado\?/);
assert.match(html,/Lembrar quantos dias antes\?/);
assert.match(html,/Saldo previsto/);
assert.match(html,/function snapshotSemanaAlim\(ref\)/);
assert.match(html,/snap\.planejadas\.length\|\|snap\.midias\.length/);
assert.match(html,/const wkAtual=weekStartISO\(brasiliaNow\(\)\), novaSemana=DEFAULT_TREINO_TEMPLATE\(\)/);
assert.match(html,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
assert.match(html,/window\.RedzoneNative\?\.requestInitialPermissions/);
console.log('FINANCAS_SEMANA_TEST=OK');
