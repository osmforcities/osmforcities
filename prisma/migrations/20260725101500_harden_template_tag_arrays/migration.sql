-- Enforce the required-array invariant at the database level for the template
-- tag arrays. Both `tags` and `filterableTags` are non-null at the Prisma/app
-- layer (Prisma scalar lists are always non-null), but the underlying columns
-- were created nullable, so a non-Prisma write could insert NULL and violate the
-- contract that dataset reads rely on. Backfill any stray NULLs, then constrain.
UPDATE "templates" SET "tags" = ARRAY[]::TEXT[] WHERE "tags" IS NULL;
ALTER TABLE "templates" ALTER COLUMN "tags" SET NOT NULL;
ALTER TABLE "templates" ALTER COLUMN "filterableTags" SET NOT NULL;
