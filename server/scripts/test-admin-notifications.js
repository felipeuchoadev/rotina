import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../../app/disciplina-v3.html',import.meta.url),'utf8');
const agenda=fs.readFileSync(new URL('../src/lib/agenda.js',import.meta.url),'utf8');
const push=fs.readFileSync(new URL('../src/lib/push.js',import.meta.url),'utf8');
const pushRoute=fs.readFileSync(new URL('../src/routes/push.js',import.meta.url),'utf8');
const admin=fs.readFileSync(new URL('../src/routes/admin.js',import.meta.url),'utf8');

assert.match(html,/class="admin-heading"/);
assert.match(html,/id="adminAtualizar"/);
assert.match(html,/function carregarAdminResumo/);
assert.match(html,/Atualizado diretamente do servidor/);
assert.match(html,/cache:'no-store'/);
assert.match(html,/function renderStatusPushAlarmes/);
assert.match(html,/redzone-v130/);
assert.match(html,/id="alarmPushAction"/);
assert.match(html,/const _avisosRotinaExatos=new Set/);
assert.doesNotMatch(html,/api\('\/push\/try-hard'/);
assert.doesNotMatch(html,/LEMBRETE ÚTIL/);
assert.match(html,/S\.profile\?\.isAdmin\|\|sessionStorage\.getItem\('rz:admin:returnToken'\)\|\|_alarmActive/);
assert.match(push,/resultado\.enviados\+\+/);
assert.match(push,/return resultado/);
assert.match(agenda,/entrega\.enviados>0/);
assert.match(agenda,/usuario:\{isAdmin:false,bloqueado:false\}/);
assert.match(pushRoute,/pushRouter\.get\('\/status'/);
assert.match(pushRoute,/pushRouter\.post\('\/test'/);
assert.match(admin,/Cache-Control','no-store'/);
assert.match(admin,/atualizadoEm:new Date\(\)\.toISOString\(\)/);

console.log('ADMIN_NOTIFICATIONS_TEST=OK');
