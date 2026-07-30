-- CreateTable
CREATE TABLE "hibi_talk_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "turns" JSONB NOT NULL,
    "summary" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "hibi_talk_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hibi_talk_session_userId_startedAt_idx" ON "hibi_talk_session"("userId", "startedAt");

-- AddForeignKey
ALTER TABLE "hibi_talk_session" ADD CONSTRAINT "hibi_talk_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "hibi_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
