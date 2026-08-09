import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../lib/db.js';
import { hashSenha, conferirSenha, assinarToken, exigirAuth } from '../lib/auth.js';
import { rankOf } from '../lib/xp.js';
import { enviarEmail, mailAtivo } from '../lib/mail.js';

export const authRouter = Router();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const APP_URL = process.env.APP_URL || 'https://redsystems.ddns.net/rotina/';

const cadastroSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  senha: z.string().min(6),
  username: z.string().regex(/^[a-z0-9_]{3,20}$/),
  nomeGuerra: z.string().min(1).max(40),
  idade: z.number().int().min(5).max(100).optional(),
  dataNasc: z.string().optional().nullable(),
  genero: z.enum(['m', 'f']).optional(),
  pesoKg: z.number().min(1).max(500),
  alturaCm: z.number().int().min(50).max(260),
});

// Cadastro (etapa 1 e 2 do front chegam juntas aqui: conta + dados pessoais)
authRouter.post('/cadastro', async (req, res) => {
  const parsed = cadastroSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: 'Dados inválidos.', detalhes: parsed.error.flatten() });
  const d = parsed.data;

  const [emailExiste, userExiste] = await Promise.all([
    prisma.usuario.findUnique({ where: { email: d.email } }),
    prisma.usuario.findUnique({ where: { username: d.username } }),
  ]);
  if (emailExiste) return res.status(409).json({ erro: 'E-mail já cadastrado.' });
  if (userExiste) return res.status(409).json({ erro: 'Username já existe.' });

  const senhaHash = await hashSenha(d.senha);
  const usuario = await prisma.usuario.create({
    data: {
      email: d.email, senhaHash, username: d.username, nomeGuerra: d.nomeGuerra,
      idade: d.idade, dataNasc: d.dataNasc ? new Date(d.dataNasc) : null, genero: d.genero || null,
      pesoKg: d.pesoKg, alturaCm: d.alturaCm, metaAgua: Math.round(d.pesoKg * 35),
    },
  });
  const token = assinarToken(usuario);
  res.status(201).json({ token, usuario: publico(usuario) });
});

// Checagem de disponibilidade (pro front validar em tempo real)
authRouter.get('/disponivel', async (req, res) => {
  const { email, username } = req.query;
  const out = {};
  if (email) out.email = !(await prisma.usuario.findUnique({ where: { email: String(email).toLowerCase() } }));
  if (username) out.username = !(await prisma.usuario.findUnique({ where: { username: String(username).toLowerCase() } }));
  res.json(out);
});

// Login por e-mail + senha
authRouter.post('/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), senha: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: 'E-mail ou senha inválidos.' });
  const email = parsed.data.email.toLowerCase().trim();
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) return res.status(401).json({ erro: 'E-mail não encontrado.' });
  const ok = await conferirSenha(parsed.data.senha, usuario.senhaHash);
  if (!ok) return res.status(401).json({ erro: 'Senha incorreta, recruta.' });
  const token = assinarToken(usuario);
  res.json({ token, usuario: publico(usuario) });
});

// Esqueci a senha: gera token e envia link por e-mail (não revela se o e-mail existe)
authRouter.post('/esqueci', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (usuario) {
    const token = crypto.randomBytes(24).toString('hex');
    const exp = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await prisma.usuario.update({ where: { id: usuario.id }, data: { resetToken: sha(token), resetExp: exp } });
    const link = `${APP_URL}#reset=${token}`;
    await enviarEmail(email, 'REDZONE — recuperar senha',
      `<p>Recruta, recebemos um pedido pra redefinir sua senha no <b>REDZONE</b>.</p>
       <p><a href="${link}">Clique aqui pra criar uma nova senha</a> (vale por 1 hora).</p>
       <p>Se não foi você, ignore este e-mail.</p>`).catch(() => {});
  }
  res.json({ ok: true, mailAtivo });
});

// Redefinir senha com o token do e-mail
authRouter.post('/resetar', async (req, res) => {
  const token = String(req.body.token || '');
  const senha = String(req.body.senha || '');
  if (senha.length < 6) return res.status(400).json({ erro: 'Senha muito curta (mínimo 6).' });
  const usuario = await prisma.usuario.findFirst({ where: { resetToken: sha(token), resetExp: { gt: new Date() } } });
  if (!usuario) return res.status(400).json({ erro: 'Link inválido ou expirado. Peça um novo.' });
  await prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash: await hashSenha(senha), resetToken: null, resetExp: null } });
  res.json({ ok: true });
});

// Trocar senha (logado, exige senha atual)
authRouter.post('/trocar-senha', exigirAuth, async (req, res) => {
  const atual = String(req.body.senhaAtual || '');
  const nova = String(req.body.novaSenha || '');
  if (nova.length < 6) return res.status(400).json({ erro: 'Nova senha muito curta (mínimo 6).' });
  const usuario = await prisma.usuario.findUnique({ where: { id: req.userId } });
  if (!usuario || !(await conferirSenha(atual, usuario.senhaHash))) return res.status(401).json({ erro: 'Senha atual incorreta.' });
  await prisma.usuario.update({ where: { id: req.userId }, data: { senhaHash: await hashSenha(nova) } });
  res.json({ ok: true });
});

// Trocar e-mail da conta (exige senha atual)
authRouter.post('/trocar-email', exigirAuth, async (req, res) => {
  const novo = String(req.body.novoEmail || '').toLowerCase().trim();
  const senha = String(req.body.senha || '');
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(novo)) return res.status(400).json({ erro: 'E-mail inválido.' });
  const usuario = await prisma.usuario.findUnique({ where: { id: req.userId } });
  if (!usuario || !(await conferirSenha(senha, usuario.senhaHash))) return res.status(401).json({ erro: 'Senha incorreta.' });
  const jaTem = await prisma.usuario.findUnique({ where: { email: novo } });
  if (jaTem && jaTem.id !== req.userId) return res.status(409).json({ erro: 'Esse e-mail já está em uso.' });
  await prisma.usuario.update({ where: { id: req.userId }, data: { email: novo } });
  res.json({ ok: true, email: novo });
});

// Excluir a conta DE VERDADE (exige senha). Cascade apaga tudo do usuário no banco.
authRouter.delete('/conta', exigirAuth, async (req, res) => {
  const senha = String(req.body.senha || '');
  const usuario = await prisma.usuario.findUnique({ where: { id: req.userId } });
  if (!usuario || !(await conferirSenha(senha, usuario.senhaHash))) return res.status(401).json({ erro: 'Senha incorreta.' });
  await prisma.usuario.delete({ where: { id: req.userId } }); // onDelete: Cascade em tudo
  res.json({ ok: true });
});

// Dados do usuário logado + patente
authRouter.get('/me', exigirAuth, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.userId } });
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  res.json({ usuario: publico(usuario), xp: usuario.xp, patente: rankOf(usuario.xp).id });
});

// Remove o hash de senha antes de mandar pro cliente
function publico(u) {
  return {
    id: u.id, email: u.email, username: u.username, nomeGuerra: u.nomeGuerra,
    fotoUrl: u.fotoUrl, idade: u.idade, dataNasc: u.dataNasc, genero: u.genero, pesoKg: u.pesoKg, alturaCm: u.alturaCm,
    metaAgua: u.metaAgua, tema: u.tema, xp: u.xp, privado: u.privado, criadoEm: u.criadoEm,
  };
}
export { publico };
