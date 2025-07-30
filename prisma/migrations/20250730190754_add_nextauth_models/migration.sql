-- Clear existing verification tokens to avoid conflicts
DELETE FROM "verification_tokens";

-- DropForeignKey
ALTER TABLE "verification_tokens"
DROP CONSTRAINT "verification_tokens_userId_fkey";

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "emailVerified" TIMESTAMP(3);

-- AlterTable (now safe since table is empty)
ALTER TABLE "verification_tokens"
DROP CONSTRAINT "verification_tokens_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "email",
DROP COLUMN "expiresAt",
DROP COLUMN "id",
DROP COLUMN "used",
DROP COLUMN "userId",
ADD COLUMN "expires" TIMESTAMP(3) NOT NULL,
ADD COLUMN "identifier" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens" ("identifier", "token");