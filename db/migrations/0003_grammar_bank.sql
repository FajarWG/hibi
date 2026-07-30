-- CreateTable
CREATE TABLE "hibi_grammar_point" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "level" TEXT NOT NULL,
    "chapter" INTEGER,
    "pattern" TEXT NOT NULL,
    "meaningId" TEXT NOT NULL,
    "frame" TEXT,
    "writingTask" TEXT NOT NULL,
    "constraints" JSONB,
    "expectedForms" JSONB,
    "weaknessTags" JSONB NOT NULL,
    "commonMistakes" JSONB,
    "examples" JSONB NOT NULL,
    "provenance" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hibi_grammar_point_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "hibi_review_item" ADD COLUMN     "grammarId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "hibi_grammar_point_legacyId_key" ON "hibi_grammar_point"("legacyId");

-- CreateIndex
CREATE INDEX "hibi_grammar_point_level_idx" ON "hibi_grammar_point"("level");

-- CreateIndex
CREATE INDEX "hibi_grammar_point_provenance_idx" ON "hibi_grammar_point"("provenance");

-- CreateIndex
CREATE UNIQUE INDEX "hibi_review_item_grammarId_key" ON "hibi_review_item"("grammarId");

-- AddForeignKey
ALTER TABLE "hibi_review_item" ADD CONSTRAINT "hibi_review_item_grammarId_fkey" FOREIGN KEY ("grammarId") REFERENCES "hibi_grammar_point"("id") ON DELETE CASCADE ON UPDATE CASCADE;
