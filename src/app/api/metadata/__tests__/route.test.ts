import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { GET } from "../route";

const originalEnv = {
  COMMIT_HASH: process.env.COMMIT_HASH,
  VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
  GITHUB_SHA: process.env.GITHUB_SHA,
};

describe("/api/metadata", () => {
  beforeEach(() => {
    delete process.env.COMMIT_HASH;
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.GITHUB_SHA;
  });

  afterEach(() => {
    if (originalEnv.COMMIT_HASH === undefined) {
      delete process.env.COMMIT_HASH;
    } else {
      process.env.COMMIT_HASH = originalEnv.COMMIT_HASH;
    }

    if (originalEnv.VERCEL_GIT_COMMIT_SHA === undefined) {
      delete process.env.VERCEL_GIT_COMMIT_SHA;
    } else {
      process.env.VERCEL_GIT_COMMIT_SHA = originalEnv.VERCEL_GIT_COMMIT_SHA;
    }

    if (originalEnv.GITHUB_SHA === undefined) {
      delete process.env.GITHUB_SHA;
    } else {
      process.env.GITHUB_SHA = originalEnv.GITHUB_SHA;
    }
  });

  it("returns commit hash from env", async () => {
    process.env.COMMIT_HASH = "test-build-hash";

    const response = await GET();
    const body = await response.json();

    expect(body.commitHash).toBe("test-build-hash");
  });

  it("returns unknown when commit hash is not available", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.commitHash).toBe("unknown");
  });
});
