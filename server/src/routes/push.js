import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';
import { vapidPublic, pushAtivo, enviarPush } from '../lib/push.js';

export const pushRouter = Router();

// Chave pública VAPID (o cliente precisa antes de se inscrever)
pushRouter.get('/vapid', (req, res) => res.json({ key: pushAtivo ? vapidPublic : null }));

pushRouter.use(exigirAuth);

// Registrar/atualizar a inscrição de push deste dispositivo
pushRouter.post('/subscribe', async (req, res) => {
  const s = req.body || {};
  if (!s.endpoint || !s.keys || !s.keys.p256dh || !s.keys.auth) return res.status(400).json({ erro: 'Inscrição inválida.' });
  await prisma.pushSub.upsert({
    where: { endpoint: s.endpoint },
    update: { usuarioId: req.userId, p256dh: s.keys.p256dh, auth: s.keys.auth },
    create: { usuarioId: req.userId, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth },
  });
  res.json({ ok: true });
});

// Cobrança do Try Hard para o próprio usuário, inclusive com o app em segundo plano.
pushRouter.post('/try-hard', async (req,res)=>{
  const tarefa=String(req.body?.tarefa||'').trim().slice(0,160);
  if(!tarefa) return res.status(400).json({erro:'Informe a tarefa.'});
  await enviarPush(req.userId,{title:'🔥 MODO TRY HARD',body:`PASSOU DO HORÁRIO: ${tarefa}. CUMPRA AGORA!`,tag:'try-hard-'+Date.now(),url:'/rotina/#tab=rotina',requireInteraction:true});
  res.json({ok:true});
});

export default pushRouter;
