CREATE TABLE "admin_avisos" (
  "id" SERIAL NOT NULL,
  "adminId" TEXT NOT NULL,
  "destinatarioId" TEXT,
  "titulo" TEXT NOT NULL,
  "mensagem" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_avisos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "aviso_dispensas" (
  "avisoId" INTEGER NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "fechadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "aviso_dispensas_pkey" PRIMARY KEY ("avisoId", "usuarioId")
);

CREATE INDEX "admin_avisos_ativo_criadoEm_idx" ON "admin_avisos"("ativo", "criadoEm");
CREATE INDEX "admin_avisos_destinatarioId_ativo_idx" ON "admin_avisos"("destinatarioId", "ativo");
CREATE INDEX "aviso_dispensas_usuarioId_idx" ON "aviso_dispensas"("usuarioId");
ALTER TABLE "aviso_dispensas" ADD CONSTRAINT "aviso_dispensas_avisoId_fkey" FOREIGN KEY ("avisoId") REFERENCES "admin_avisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
