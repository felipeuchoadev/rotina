import webpush from 'web-push';
import { prisma } from './db.js';

const PUB = process.env.VAPID_PUBLIC || '';
const PRIV = process.env.VAPID_PRIVATE || '';
export const pushAtivo = !!(PUB && PRIV);

if (pushAtivo) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@redsystems.ddns.net', PUB, PRIV);
}
export const vapidPublic = PUB;

// Envia notificação push pra todos os dispositivos de um usuário (mesmo app fechado)
export async function enviarPush(usuarioId, payload) {
  if (!pushAtivo || !usuarioId) return;
  let subs = [];
  try { subs = await prisma.pushSub.findMany({ where: { usuarioId } }); } catch { return; }
  await Promise.all(subs.map(s =>
    webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload))
      .catch(async (err) => {
        // inscrição expirada/inválida → remove
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          try { await prisma.pushSub.deleteMany({ where: { endpoint: s.endpoint } }); } catch {}
        }
      })
  ));
}
