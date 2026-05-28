-- Create Category model
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- Create foreign key for parent-child relationship
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rename existing category column to categoryName
ALTER TABLE "templates" RENAME COLUMN "category" TO "categoryName";

-- Add categoryId as nullable initially
ALTER TABLE "templates" ADD COLUMN "categoryId" TEXT;

-- Create foreign key for category relation (will be enforced after data migration)
ALTER TABLE "templates" ADD CONSTRAINT "templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert Category Groups (parent categories)
INSERT INTO "categories" (id, name, slug, "parentId") VALUES
    ('cat_infrastructure', 'Infrastructure', 'infrastructure', NULL),
    ('cat_services', 'Services', 'services', NULL),
    ('cat_places', 'Places', 'places', NULL),
    ('cat_community', 'Community', 'community', NULL),
    ('cat_environment', 'Environment', 'environment', NULL),
    ('cat_other', 'Other', 'other', NULL);

-- Insert child categories for Infrastructure
INSERT INTO "categories" (id, name, slug, "parentId") VALUES
    ('cat_transport', 'transport', 'transport', 'cat_infrastructure'),
    ('cat_transport_infrastructure', 'transport_infrastructure', 'transport_infrastructure', 'cat_infrastructure'),
    ('cat_transportation', 'transportation', 'transportation', 'cat_infrastructure'),
    ('cat_traffic', 'traffic', 'traffic', 'cat_infrastructure'),
    ('cat_infrastructure_general', 'infrastructure', 'infrastructure-general', 'cat_infrastructure');

-- Insert child categories for Services
INSERT INTO "categories" (id, name, slug, "parentId") VALUES
    ('cat_healthcare', 'healthcare', 'healthcare', 'cat_services'),
    ('cat_education', 'education', 'education', 'cat_services'),
    ('cat_government', 'government', 'government', 'cat_services'),
    ('cat_emergency', 'emergency', 'emergency', 'cat_services'),
    ('cat_financial', 'financial', 'financial', 'cat_services');

-- Insert child categories for Places
INSERT INTO "categories" (id, name, slug, "parentId") VALUES
    ('cat_shops', 'shops', 'shops', 'cat_places'),
    ('cat_food', 'food', 'food', 'cat_places'),
    ('cat_amenities', 'amenities', 'amenities', 'cat_places'),
    ('cat_housing', 'housing', 'housing', 'cat_places'),
    ('cat_religion', 'religion', 'religion', 'cat_places');

-- Insert child categories for Community
INSERT INTO "categories" (id, name, slug, "parentId") VALUES
    ('cat_social', 'social', 'social', 'cat_community'),
    ('cat_culture', 'culture', 'culture', 'cat_community'),
    ('cat_sports', 'sports', 'sports', 'cat_community'),
    ('cat_leisure', 'leisure', 'leisure', 'cat_community');

-- Insert child categories for Environment
INSERT INTO "categories" (id, name, slug, "parentId") VALUES
    ('cat_nature', 'nature', 'nature', 'cat_environment'),
    ('cat_environment_general', 'environment', 'environment-general', 'cat_environment'),
    ('cat_agriculture', 'agriculture', 'agriculture', 'cat_environment');

-- Insert child categories for Other
INSERT INTO "categories" (id, name, slug, "parentId") VALUES
    ('cat_barriers', 'barriers', 'barriers', 'cat_other'),
    ('cat_public', 'public', 'public', 'cat_other'),
    ('cat_tourism', 'tourism', 'tourism', 'cat_other');

-- Populate categoryId for templates based on categoryName
UPDATE "templates" SET "categoryId" =
    CASE "categoryName"
        WHEN 'transport' THEN 'cat_transport'
        WHEN 'transport_infrastructure' THEN 'cat_transport_infrastructure'
        WHEN 'transportation' THEN 'cat_transportation'
        WHEN 'traffic' THEN 'cat_traffic'
        WHEN 'infrastructure' THEN 'cat_infrastructure_general'
        WHEN 'healthcare' THEN 'cat_healthcare'
        WHEN 'education' THEN 'cat_education'
        WHEN 'government' THEN 'cat_government'
        WHEN 'emergency' THEN 'cat_emergency'
        WHEN 'financial' THEN 'cat_financial'
        WHEN 'shops' THEN 'cat_shops'
        WHEN 'food' THEN 'cat_food'
        WHEN 'amenities' THEN 'cat_amenities'
        WHEN 'housing' THEN 'cat_housing'
        WHEN 'religion' THEN 'cat_religion'
        WHEN 'social' THEN 'cat_social'
        WHEN 'culture' THEN 'cat_culture'
        WHEN 'sports' THEN 'cat_sports'
        WHEN 'leisure' THEN 'cat_leisure'
        WHEN 'nature' THEN 'cat_nature'
        WHEN 'environment' THEN 'cat_environment_general'
        WHEN 'agriculture' THEN 'cat_agriculture'
        WHEN 'barriers' THEN 'cat_barriers'
        WHEN 'public' THEN 'cat_public'
        WHEN 'tourism' THEN 'cat_tourism'
        ELSE 'cat_other'
    END;

-- Make categoryId required (NOT NULL)
ALTER TABLE "templates" ALTER COLUMN "categoryId" SET NOT NULL;

-- Drop the old categoryName column
ALTER TABLE "templates" DROP COLUMN "categoryName";
