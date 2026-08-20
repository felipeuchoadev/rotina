ALTER TABLE "usuarios"
  ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bloqueado" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "admin_audit" (
  "id" SERIAL NOT NULL,
  "adminId" TEXT NOT NULL,
  "alvoId" TEXT,
  "acao" TEXT NOT NULL,
  "detalhes" JSONB,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_adminId_criadoEm_idx" ON "admin_audit"("adminId", "criadoEm");
CREATE INDEX "admin_audit_alvoId_criadoEm_idx" ON "admin_audit"("alvoId", "criadoEm");
