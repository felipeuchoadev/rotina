import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';

export const avisosRouter = Router();
avisosRouter.use(exigirAuth);

avisosRouter.get('/', async (req,res)=>{
  const avisos=await prisma.adminAviso.findMany({
    where:{ativo:true,OR:[{destinatarioId:null},{destinatarioId:req.userId}],NOT:{dispensas:{some:{usuarioId:req.userId}}}},
    orderBy:{criadoEm:'asc'},take:10,select:{id:true,titulo:true,mensagem:true,criadoEm:true},
  });
  res.json({avisos});
});

avisosRouter.post('/:id/dispensar',async(req,res)=>{
  const avisoId=Number(req.params.id);if(!avisoId)return res.status(400).json({erro:'Aviso inválido.'});
  const existe=await prisma.adminAviso.findFirst({where:{id:avisoId,OR:[{destinatarioId:null},{destinatarioId:req.userId}]},select:{id:true}});
  if(!existe)return res.status(404).json({erro:'Aviso não encontrado.'});
  await prisma.avisoDispensa.upsert({where:{avisoId_usuarioId:{avisoId,usuarioId:req.userId}},update:{fechadoEm:new Date()},create:{avisoId,usuarioId:req.userId}});
  res.json({ok:true});
});

export default avisosRouter;
