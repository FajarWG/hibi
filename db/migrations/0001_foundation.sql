-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "hibi_role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "hibi_user" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "hibi_role" NOT NULL DEFAULT 'USER',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hibi_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hibi_study_timer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "context" TEXT,
    "accumulatedSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastStartedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hibi_study_timer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hibi_user_legacyId_key" ON "hibi_user"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "hibi_user_username_key" ON "hibi_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "hibi_study_timer_activeKey_key" ON "hibi_study_timer"("activeKey");

-- CreateIndex
CREATE INDEX "hibi_study_timer_userId_startedAt_idx" ON "hibi_study_timer"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "hibi_study_timer_userId_status_idx" ON "hibi_study_timer"("userId", "status");

-- AddForeignKey
ALTER TABLE "hibi_study_timer" ADD CONSTRAINT "hibi_study_timer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "hibi_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

