// app/src/lib/__tests__/dataset-operations.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
    area: {
      findUnique: vi.fn().mockResolvedValue({
        id: 1,
        name: "Test Area",
        countryCode: "US",
        bounds: null,
        geojson: null,
      }),
    },
  },
}));

vi.mock("@/lib/template-resolver", () => ({
  resolveTemplate: vi.fn().mockResolvedValue({
    id: "tmpl-1",
    isActive: true,
    deprecatesAt: null,
    overpassQuery: "[out:json]; node; out;",
    name: "Test Template",
    description: "",
    category: "test",
    tags: [],
    translations: [],
  }),
}));

vi.mock("@/lib/osm", () => ({
  fetchDatasetSnapshot: vi.fn(),
  fetchOsmRelationData: vi.fn(),
}));

vi.mock("@/lib/umami", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/template-locale", () => ({
  resolveTemplateForLocale: vi.fn((t) => t),
}));

vi.mock("@/lib/nominatim", () => ({
  getAreaDetailsById: vi.fn(),
}));

import { getOrCreateDataset } from "@/lib/dataset-operations";
import { fetchDatasetSnapshot } from "@/lib/osm";

const mockFetchDatasetSnapshot = vi.mocked(fetchDatasetSnapshot);

describe("getOrCreateDataset — error sanitization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not expose raw Overpass API errors to callers", async () => {
    mockFetchDatasetSnapshot.mockRejectedValue(
      new Error("Overpass API error: Database error: relation 12345 not found")
    );

    let caughtError: Error | null = null;
    try {
      await getOrCreateDataset(1, "test-template", "en");
    } catch (e) {
      caughtError = e as Error;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).not.toContain("Database error");
    expect(caughtError!.message).not.toContain("relation 12345");
    expect(caughtError!.message).not.toContain("Overpass API error");
  });

  it("does not expose raw error messages from unknown failures", async () => {
    mockFetchDatasetSnapshot.mockRejectedValue(
      new Error("Internal server error: stack overflow in query parser")
    );

    let caughtError: Error | null = null;
    try {
      await getOrCreateDataset(1, "test-template", "en");
    } catch (e) {
      caughtError = e as Error;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).not.toContain("stack overflow");
    expect(caughtError!.message).not.toContain("query parser");
  });

  it("preserves timeout error as user-friendly message", async () => {
    mockFetchDatasetSnapshot.mockRejectedValue(
      new Error("Overpass API timeout exceeded")
    );

    await expect(getOrCreateDataset(1, "test-template", "en")).rejects.toThrow(
      "Request timed out"
    );
  });

  it("preserves too-large error as user-friendly message", async () => {
    mockFetchDatasetSnapshot.mockRejectedValue(
      new Error("Response too large for query")
    );

    await expect(getOrCreateDataset(1, "test-template", "en")).rejects.toThrow(
      "Dataset too large"
    );
  });
});
