-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
