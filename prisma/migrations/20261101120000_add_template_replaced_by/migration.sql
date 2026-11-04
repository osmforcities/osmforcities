-- AlterTable
ALTER TABLE "templates" ADD COLUMN "replacedById" TEXT;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
