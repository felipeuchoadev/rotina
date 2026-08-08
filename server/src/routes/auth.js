import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { hashSenha, conferirSenha, assinarToken, exigirAuth } from '../lib/auth.js';
import { xpDoUsuario, rankOf } from '../lib/xp.js';

export const authRouter = Router();

const cadastroSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  senha: z.string().min(6),
  username: z.string().regex(/^[a-z0-9_]{3,20}$/),
  nomeGuerra: z.string().min(1).max(40),
  idade: z.number().int().min(10).max(90),
  pesoKg: z.number().min(30).max(250),
  alturaCm: z.number().int().min(120).max(230),
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
      idade: d.idade, pesoKg: d.pesoKg, alturaCm: d.alturaCm, metaAgua: Math.round(d.pesoKg * 35),
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

// Dados do usuário logado + XP/patente
authRouter.get('/me', exigirAuth, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.userId } });
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  const xp = await xpDoUsuario(prisma, usuario.id);
  res.json({ usuario: publico(usuario), xp, patente: rankOf(xp).id });
});

// Remove o hash de senha antes de mandar pro cliente
function publico(u) {
  return {
    id: u.id, email: u.email, username: u.username, nomeGuerra: u.nomeGuerra,
    fotoUrl: u.fotoUrl, idade: u.idade, pesoKg: u.pesoKg, alturaCm: u.alturaCm,
    metaAgua: u.metaAgua, tema: u.tema, criadoEm: u.criadoEm,
  };
}
export { publico };
