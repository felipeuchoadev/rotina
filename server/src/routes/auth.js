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
  nomeGuerra: z.string().trim().min(1).max(40),
  idade: z.number().int().min(5).max(100).optional(),
  dataNasc: z.string().optional().nullable(),
  genero: z.enum(['m', 'f']).optional(),
  secPergunta: z.string().min(1).max(120),
  secResposta: z.string().min(1).max(120),
  pesoKg: z.number().min(1).max(500),
  alturaCm: z.number().int().min(50).max(260),
});
// Resposta de segurança: match EXATO (case-sensitive). Só apara espaços das bordas,
// mas preserva maiúsculas/minúsculas — se a pessoa botou maiúscula, só vale com maiúscula.
const normResp = (s) => String(s || '').trim();

// Cadastro (etapa 1 e 2 do front chegam juntas aqui: conta + dados pessoais)
authRouter.post('/cadastro', async (req, res) => {
  const parsed = cadastroSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: 'Dados inválidos.', detalhes: parsed.error.flatten() });
  const d = { ...parsed.data, username: parsed.data.username.toLowerCase(), nomeGuerra: parsed.data.nomeGuerra.trim() };

  const [emailExiste, userExiste, nomeExiste] = await Promise.all([
    prisma.usuario.findUnique({ where: { email: d.email } }),
    prisma.usuario.findUnique({ where: { username: d.username } }),
    prisma.usuario.findFirst({ where: { nomeGuerra: { equals: d.nomeGuerra.trim(), mode: 'insensitive' } } }),
  ]);
  if (emailExiste) return res.status(409).json({ erro: 'E-mail já cadastrado.' });
  if (userExiste) return res.status(409).json({ erro: 'Username já existe.' });
  if (nomeExiste) return res.status(409).json({ erro: 'Esse nome de guerra já está em missão por aqui. Escolha outro que seja só seu.' });

  const senhaHash = await hashSenha(d.senha);
  let usuario;
  try { usuario = await prisma.usuario.create({
    data: {
      email: d.email, senhaHash, username: d.username, nomeGuerra: d.nomeGuerra,
      idade: d.idade, dataNasc: d.dataNasc ? new Date(d.dataNasc) : null, genero: d.genero || null,
      secPergunta: d.secPergunta || null, secRespHash: d.secResposta ? await hashSenha(normResp(d.secResposta)) : null,
      pesoKg: d.pesoKg, alturaCm: d.alturaCm, metaAgua: Math.round(d.pesoKg * 35),
    },
  }); } catch (e) {
    if (e?.code === 'P2002') {
      const alvo = Array.isArray(e.meta?.target) ? e.meta.target.join(' ') : String(e.meta?.target || '');
      if (alvo.includes('nomeGuerra') || alvo.includes('nome_guerra')) return res.status(409).json({ campo:'nomeGuerra', erro:'Esse nome de guerra já está em missão por aqui. Escolha outro que seja só seu.' });
      if (alvo.includes('username')) return res.status(409).json({ campo:'username', erro:'Esse username já existe. Escolha outro.' });
      if (alvo.includes('email')) return res.status(409).json({ campo:'email', erro:'E-mail já cadastrado.' });
    }
    throw e;
  }
  const token = assinarToken(usuario);
  res.status(201).json({ token, usuario: publico(usuario) });
});

// Checagem de disponibilidade (pro front validar em tempo real)
authRouter.get('/disponivel', async (req, res) => {
  const { email, username, nomeGuerra } = req.query;
  const out = {};
  if (email) out.email = !(await prisma.usuario.findUnique({ where: { email: String(email).toLowerCase() } }));
  if (username) out.username = !(await prisma.usuario.findUnique({ where: { username: String(username).toLowerCase() } }));
  if (nomeGuerra) out.nomeGuerra = !(await prisma.usuario.findFirst({ where: { nomeGuerra: { equals: String(nomeGuerra).trim(), mode: 'insensitive' } } }));
  res.json(out);
});

// Login por e-mail ou username + senha
authRouter.post('/login', async (req, res) => {
  const schema = z.object({ identificador: z.string().min(1).optional(), email: z.string().optional(), senha: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: 'E-mail ou senha inválidos.' });
  const identificador = String(parsed.data.identificador || parsed.data.email || '').toLowerCase().trim();
  if (!identificador) return res.status(400).json({ erro: 'Informe seu e-mail ou usuário.' });
  const usuario = identificador.includes('@')
    ? await prisma.usuario.findUnique({ where: { email: identificador } })
    : await prisma.usuario.findUnique({ where: { username: identificador } });
  if (!usuario) return res.status(401).json({ erro: 'Conta não encontrada.' });
  if (usuario.bloqueado) return res.status(403).json({ erro: 'Esta conta está temporariamente bloqueada. Fale com o suporte REDZONE.' });
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

// Recuperação por PERGUNTA DE SEGURANÇA (universal, sem e-mail)
// 1) pega a pergunta pelo e-mail
authRouter.get('/pergunta', async (req, res) => {
  const email = String(req.query.email || '').toLowerCase().trim();
  const u = await prisma.usuario.findUnique({ where: { email } });
  res.json({ pergunta: (u && u.secPergunta) ? u.secPergunta : null });
});
// 2) responde certo e define nova senha
authRouter.post('/resetar-pergunta', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const resposta = normResp(req.body.resposta);
  const senha = String(req.body.novaSenha || '');
  if (senha.length < 6) return res.status(400).json({ erro: 'Senha muito curta (mínimo 6).' });
  const u = await prisma.usuario.findUnique({ where: { email } });
  if (!u || !u.secRespHash) return res.status(400).json({ erro: 'Essa conta não tem pergunta de segurança.' });
  if (!(await conferirSenha(resposta, u.secRespHash))) return res.status(401).json({ erro: 'Resposta incorreta.' });
  await prisma.usuario.update({ where: { id: u.id }, data: { senhaHash: await hashSenha(senha) } });
  res.json({ ok: true });
});

// Definir/alterar a pergunta de segurança (logado)
authRouter.post('/set-pergunta', exigirAuth, async (req, res) => {
  const secPergunta = String(req.body.secPergunta || '').trim().slice(0, 120);
  const resposta = normResp(req.body.secResposta);
  if (!secPergunta || !resposta) return res.status(400).json({ erro: 'Pergunta e resposta são obrigatórias.' });
  await prisma.usuario.update({ where: { id: req.userId }, data: { secPergunta, secRespHash: await hashSenha(resposta) } });
  res.json({ ok: true });
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
    isAdmin: !!u.isAdmin,
  };
}
export { publico };
