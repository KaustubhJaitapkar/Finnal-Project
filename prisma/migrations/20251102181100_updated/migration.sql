-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_postId_fkey";

-- CreateTable
CREATE TABLE "Eligibility" (
    "id" TEXT NOT NULL,
    "organizerHackathonId" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Eligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizerHackathon" (
    "id" TEXT NOT NULL,
    "hackathonName" TEXT NOT NULL,
    "regURL" TEXT NOT NULL,
    "hackathonMode" TEXT NOT NULL,
    "memberCount" TEXT NOT NULL,
    "regDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerHackathon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalHackathonFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "logo" TEXT,
    "platform" TEXT NOT NULL,
    "mode" TEXT,
    "location" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalHackathonFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Eligibility_organizerHackathonId_key" ON "Eligibility"("organizerHackathonId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalHackathonFavorite_userId_externalId_platform_key" ON "ExternalHackathonFavorite"("userId", "externalId", "platform");

-- AddForeignKey
ALTER TABLE "Eligibility" ADD CONSTRAINT "Eligibility_organizerHackathonId_fkey" FOREIGN KEY ("organizerHackathonId") REFERENCES "OrganizerHackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalHackathonFavorite" ADD CONSTRAINT "ExternalHackathonFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_postId_fkey" FOREIGN KEY ("postId") REFERENCES "OrganizerHackathon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
