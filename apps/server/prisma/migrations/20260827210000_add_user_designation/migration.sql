-- CreateEnum
CREATE TYPE "Designation" AS ENUM ('PHD', 'MD', 'MSC', 'BSC', 'BTECH', 'MTECH', 'POSTDOC', 'PROFESSOR', 'RESEARCH_SCIENTIST', 'GRADUATE_STUDENT', 'UNDERGRADUATE', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "designation" "Designation";
