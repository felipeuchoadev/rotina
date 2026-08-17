CREATE TABLE "story_views" (
  "ownerId" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "viewerId" TEXT NOT NULL,
  "vistoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "story_views_pkey" PRIMARY KEY ("ownerId", "recordId", "viewerId")
);
CREATE INDEX "story_views_ownerId_recordId_vistoEm_idx" ON "story_views"("ownerId", "recordId", "vistoEm");
