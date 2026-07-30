-- CreateTable
CREATE TABLE "hibi_writing_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grammarId" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'grammar',
    "level" TEXT,
    "prompt" JSONB NOT NULL,
    "text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "hibi_writing_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hibi_writing_review" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "corrections" JSONB NOT NULL,
    "scores" JSONB,
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hibi_writing_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hibi_weakness" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hibi_weakness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hibi_writing_session_userId_startedAt_idx" ON "hibi_writing_session"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "hibi_writing_review_sessionId_idx" ON "hibi_writing_review"("sessionId");

-- CreateIndex
CREATE INDEX "hibi_weakness_userId_hits_idx" ON "hibi_weakness"("userId", "hits");

-- CreateIndex
CREATE UNIQUE INDEX "hibi_weakness_userId_category_key" ON "hibi_weakness"("userId", "category");

-- AddForeignKey
ALTER TABLE "hibi_writing_session" ADD CONSTRAINT "hibi_writing_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "hibi_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hibi_writing_review" ADD CONSTRAINT "hibi_writing_review_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "hibi_writing_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hibi_weakness" ADD CONSTRAINT "hibi_weakness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "hibi_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
