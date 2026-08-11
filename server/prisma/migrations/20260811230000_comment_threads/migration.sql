ALTER TABLE "feed_comments" ADD COLUMN "parentId" INTEGER;
ALTER TABLE "notificacoes" ADD COLUMN "alvoCommentId" INTEGER;
CREATE INDEX "feed_comments_postId_parentId_idx" ON "feed_comments"("postId", "parentId");
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "feed_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "feed_comment_likes" (
  "commentId" INTEGER NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feed_comment_likes_pkey" PRIMARY KEY ("commentId", "usuarioId")
);
ALTER TABLE "feed_comment_likes" ADD CONSTRAINT "feed_comment_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "feed_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feed_comment_likes" ADD CONSTRAINT "feed_comment_likes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
