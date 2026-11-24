-- lastAttempted is set, not NULL: the refresh orders by it ascending, and Postgres sorts NULLs last
UPDATE "datasets"
SET "isActive" = true,
    "tilesState" = 'counting',
    "tilesError" = NULL,
    "lastAttempted" = "createdAt",
    "consecutiveFailures" = 0,
    "lastError" = NULL
WHERE "isActive" = false
  AND "lastError" LIKE 'Dataset too large:%';
