-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "details" JSONB NOT NULL,
    "ratedSkills" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_teamId_applicantId_key" ON "Recommendation"("teamId", "applicantId");
