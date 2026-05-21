-- CreateTable
CREATE TABLE
    "template_translations" (
        "id" TEXT NOT NULL,
        "templateId" TEXT NOT NULL,
        "locale" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        CONSTRAINT "template_translations_pkey" PRIMARY KEY ("id")
    );

-- CreateIndex
CREATE UNIQUE INDEX "template_translations_templateId_locale_key" ON "template_translations" ("templateId", "locale");

-- AddForeignKey
ALTER TABLE "template_translations" ADD CONSTRAINT "template_translations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE;