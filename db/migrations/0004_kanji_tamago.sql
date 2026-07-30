-- CreateTable
CREATE TABLE "hibi_kanji_entry" (
    "id" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "readings" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "examples" JSONB,
    "radicals" JSONB,
    "strokeSvg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hibi_kanji_entry_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "hibi_review_item" ADD COLUMN     "kanjiId" TEXT;

-- CreateIndex
CREATE INDEX "hibi_kanji_entry_chapter_idx" ON "hibi_kanji_entry"("chapter");

-- CreateIndex
CREATE UNIQUE INDEX "hibi_kanji_entry_chapter_category_character_key" ON "hibi_kanji_entry"("chapter", "category", "character");

-- CreateIndex
CREATE UNIQUE INDEX "hibi_review_item_kanjiId_key" ON "hibi_review_item"("kanjiId");

-- AddForeignKey
ALTER TABLE "hibi_review_item" ADD CONSTRAINT "hibi_review_item_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "hibi_kanji_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
