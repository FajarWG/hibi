-- CreateEnum
CREATE TYPE "hibi_review_item_kind" AS ENUM ('VOCAB', 'KANJI', 'GRAMMAR');

-- CreateEnum
CREATE TYPE "hibi_review_direction" AS ENUM ('RECOGNIZE', 'RECALL');

-- AlterTable
ALTER TABLE "hibi_user" ADD COLUMN     "legacyPasswordHash" TEXT;

-- CreateTable
CREATE TABLE "hibi_vocab_card" (
    "id" TEXT NOT NULL,
    "legacyKey" TEXT NOT NULL,
    "legacyAnkiId" TEXT,
    "source" TEXT NOT NULL,
    "deck" TEXT NOT NULL,
    "chapter" TEXT,
    "sectionIndex" INTEGER,
    "sourceOrder" INTEGER,
    "term" TEXT NOT NULL,
    "reading" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "romaji" TEXT,
    "audioFile" TEXT,
    "imageFile" TEXT,
    "sentence" TEXT,
    "sentenceMeaning" TEXT,
    "sentenceAudioFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hibi_vocab_card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hibi_review_item" (
    "id" TEXT NOT NULL,
    "kind" "hibi_review_item_kind" NOT NULL,
    "vocabId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hibi_review_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hibi_review_state" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "direction" "hibi_review_direction" NOT NULL DEFAULT 'RECOGNIZE',
    "legacyProgressId" INTEGER,
    "legacyCardKey" TEXT,
    "legacyInterval" INTEGER,
    "legacyEase" DOUBLE PRECISION,
    "legacyRepetitions" INTEGER,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "state" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "scheduledDays" INTEGER NOT NULL DEFAULT 0,
    "elapsedDays" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hibi_review_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hibi_review_log" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "state" INTEGER NOT NULL,
    "stability" DOUBLE PRECISION NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "elapsedDays" INTEGER NOT NULL,
    "scheduledDays" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "elapsedMs" INTEGER,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hibi_review_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hibi_vocab_card_legacyKey_key" ON "hibi_vocab_card"("legacyKey");

-- CreateIndex
CREATE UNIQUE INDEX "hibi_vocab_card_legacyAnkiId_key" ON "hibi_vocab_card"("legacyAnkiId");

-- CreateIndex
CREATE INDEX "hibi_vocab_card_deck_idx" ON "hibi_vocab_card"("deck");

-- CreateIndex
CREATE INDEX "hibi_vocab_card_source_idx" ON "hibi_vocab_card"("source");

-- CreateIndex
CREATE INDEX "hibi_vocab_card_term_reading_idx" ON "hibi_vocab_card"("term", "reading");

-- CreateIndex
CREATE UNIQUE INDEX "hibi_review_item_vocabId_key" ON "hibi_review_item"("vocabId");

-- CreateIndex
CREATE INDEX "hibi_review_item_kind_idx" ON "hibi_review_item"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "hibi_review_state_legacyProgressId_key" ON "hibi_review_state"("legacyProgressId");

-- CreateIndex
CREATE INDEX "hibi_review_state_userId_dueAt_idx" ON "hibi_review_state"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "hibi_review_state_itemId_idx" ON "hibi_review_state"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "hibi_review_state_userId_itemId_direction_key" ON "hibi_review_state"("userId", "itemId", "direction");

-- CreateIndex
CREATE INDEX "hibi_review_log_stateId_reviewedAt_idx" ON "hibi_review_log"("stateId", "reviewedAt");

-- AddForeignKey
ALTER TABLE "hibi_review_item" ADD CONSTRAINT "hibi_review_item_vocabId_fkey" FOREIGN KEY ("vocabId") REFERENCES "hibi_vocab_card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hibi_review_state" ADD CONSTRAINT "hibi_review_state_userId_fkey" FOREIGN KEY ("userId") REFERENCES "hibi_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hibi_review_state" ADD CONSTRAINT "hibi_review_state_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "hibi_review_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hibi_review_log" ADD CONSTRAINT "hibi_review_log_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "hibi_review_state"("id") ON DELETE CASCADE ON UPDATE CASCADE;

