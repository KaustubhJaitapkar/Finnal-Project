/*
  Warnings:

  - Added the required column `userId` to the `OrganizerHackathon` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrganizerHackathon" ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "OrganizerHackathon" ADD CONSTRAINT "OrganizerHackathon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
