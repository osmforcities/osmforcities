-- Rename data_templates table to templates
ALTER TABLE "data_templates"
RENAME TO "templates";

-- Rename the foreign key constraint
ALTER TABLE "datasets"
DROP CONSTRAINT "monitors_templateId_fkey";

ALTER TABLE "datasets" ADD CONSTRAINT "datasets_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates" ("id") ON DELETE CASCADE;