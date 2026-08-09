// Envio de e-mail (reset de senha). Usa SMTP via variáveis de ambiente.
// Configure no server/.env:  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
// Ex. Gmail: SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_USER=voce@gmail.com SMTP_PASS=<app-password>
// Sem SMTP configurado, cai em modo DEV: só loga o link no servidor (não envia de verdade).
import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
export const mailAtivo = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter = null;
if (mailAtivo) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 465,
    secure: Number(SMTP_PORT) !== 587, // 465 = SSL, 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function enviarEmail(para, assunto, html) {
  if (!mailAtivo) {
    console.log(`[MAIL DEV] Para: ${para} | ${assunto}\n${html.replace(/<[^>]+>/g, ' ')}`);
    return { dev: true };
  }
  await transporter.sendMail({ from: MAIL_FROM || SMTP_USER, to: para, subject: assunto, html });
  return { ok: true };
}
