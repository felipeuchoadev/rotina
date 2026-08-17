ALTER TABLE "mensagens"
  ADD COLUMN "respostaAId" INTEGER,
  ADD COLUMN "respostaTexto" TEXT,
  ADD COLUMN "respostaTipo" TEXT,
  ADD COLUMN "respostaMeu" BOOLEAN;
