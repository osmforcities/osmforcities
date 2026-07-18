-- CreateTable
CREATE TABLE "area_size_checks" (
    "id" TEXT NOT NULL,
    "areaId" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "estimatedBytes" INTEGER,
    "actualBytes" INTEGER,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "area_size_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "area_size_checks_areaId_templateId_key" ON "area_size_checks"("areaId", "templateId");
