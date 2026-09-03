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
  const resultado = { ativo: pushAtivo, tentados: 0, enviados: 0, falhas: 0, removidos: 0 };
  if (!pushAtivo || !usuarioId) return resultado;
  let subs = [];
  try { subs = await prisma.pushSub.findMany({ where: { usuarioId } }); } catch { resultado.falhas++; return resultado; }
  resultado.tentados = subs.length;
  await Promise.all(subs.map(s =>
    webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload))
      .then(() => { resultado.enviados++; })
      .catch(async (err) => {
        resultado.falhas++;
        // inscrição expirada/inválida → remove
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          try { await prisma.pushSub.deleteMany({ where: { endpoint: s.endpoint } }); resultado.removidos++; } catch {}
        }
      })
  ));
  return resultado;
}
