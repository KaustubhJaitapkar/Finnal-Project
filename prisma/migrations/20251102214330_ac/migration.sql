-- AlterTable
ALTER TABLE "OrganizerHackathon" ADD COLUMN     "experience" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "teamName" TEXT;
