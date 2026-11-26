// app/src/lib/__tests__/dataset-operations.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    area: {
      findUnique: vi.fn().mockResolvedValue({
        id: 1,
        name: "Test Area",
        countryCode: "US",
        bounds: null,
        centerLat: 38.7,
        centerLon: -9.1,
        refreshedAt: new Date(),
        geojson: null,
      }),
      update: vi.fn(),
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

vi.mock("@/lib/area-boundary", () => ({
  fetchOsmRelationData: vi.fn(),
}));

vi.mock("@/lib/tiler/client", () => ({
  tilerEnabled: vi.fn(() => true),
}));

vi.mock("@/lib/dataset-count-probe", () => ({
  startCountProbe: vi.fn(),
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

vi.mock("@/lib/area-refresh", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/area-refresh")>();
  return {
    ...actual,
    refreshAreaInfoIfStale: vi.fn((area: unknown) => Promise.resolve(area)),
  };
});

import { getOrCreateDataset } from "@/lib/dataset-operations";
import { refreshAreaInfoIfStale } from "@/lib/area-refresh";
import { tilerEnabled } from "@/lib/tiler/client";
import { startCountProbe } from "@/lib/dataset-count-probe";
import { prisma } from "@/lib/db";

const mockDatasetFindFirst = vi.mocked(prisma.dataset.findFirst);
const mockRefreshAreaInfoIfStale = vi.mocked(refreshAreaInfoIfStale);

const existingDatasetRow = {
  id: "ds-1",
  templateId: "tmpl-1",
  areaId: 1,
  cityName: "Test City",
  bbox: null,
  dataCount: 5,
  lastChecked: new Date(),
  stats: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  isFeatured: true,
  template: { id: "tmpl-1", name: "Test", description: null, translations: [] },
  area: {
    id: 1,
    name: "Test City",
    countryCode: "US",
    bounds: "38.69,-9.2,38.79,-9.1",
    centerLat: 38.7,
    centerLon: -9.1,
    refreshedAt: new Date(),
    geojson: null,
  },
  user: null,
  savedBy: [],
};

describe("getOrCreateDataset — isFeatured passthrough", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selects isFeatured and returns it so the toggle reflects real state", async () => {
    mockDatasetFindFirst.mockResolvedValueOnce(existingDatasetRow as never);

    const { dataset } = await getOrCreateDataset(1, "test-template", "en");

    // The select must request isFeatured, otherwise the detail page button
    // always initializes to "not featured" regardless of the DB value.
    const selectArg = mockDatasetFindFirst.mock.calls[0]?.[0]?.select;
    expect(selectArg?.isFeatured).toBe(true);
    expect(dataset.isFeatured).toBe(true);
  });
});

describe("getOrCreateDataset — stored geojson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports stored geojson without reading it", async () => {
    mockDatasetFindFirst.mockResolvedValueOnce(existingDatasetRow as never);
    vi.mocked(prisma.dataset.count).mockResolvedValueOnce(1);

    const { dataset } = await getOrCreateDataset(1, "test-template", "en");

    expect(mockDatasetFindFirst.mock.calls[0]?.[0]?.select).not.toHaveProperty(
      "geojson"
    );
    expect(dataset.hasGeojson).toBe(true);
  });
});

describe("getOrCreateDataset — area info refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hands the area to refreshAreaInfoIfStale without blocking the response", async () => {
    mockDatasetFindFirst.mockResolvedValueOnce(existingDatasetRow as never);

    await getOrCreateDataset(1, "test-template", "en");
    // Refresh is fire-and-forget; flush pending promises
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockRefreshAreaInfoIfStale).toHaveBeenCalledWith(
      existingDatasetRow.area
    );
  });
});

describe("getOrCreateDataset — creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.mocked(tilerEnabled).mockReturnValue(true);
  });

  it("creates a counting row and leaves the count probe to after the response", async () => {
    vi.mocked(prisma.dataset.create).mockResolvedValue({
      ...existingDatasetRow,
      dataCount: 0,
      tilesState: "counting",
    } as never);

    const { dataset, wasCreated } = await getOrCreateDataset(1, "test-template", "en");

    expect(wasCreated).toBe(true);
    expect(dataset.tilesState).toBe("counting");
    expect(vi.mocked(prisma.dataset.create).mock.calls[0][0].data).toMatchObject({
      tilesState: "counting",
      lastAttempted: expect.any(Date),
    });
    const { lastAttempted } = vi.mocked(prisma.dataset.create).mock.calls[0][0].data;
    expect(startCountProbe).toHaveBeenCalledWith(dataset.id, lastAttempted);
  });

  describe("without a tiler", () => {
    beforeEach(() => {
      vi.mocked(tilerEnabled).mockReturnValue(false);
    });

    it("refuses to create a dataset and writes no row", async () => {
      await expect(getOrCreateDataset(1, "test-template", "en")).rejects.toThrow(
        "New datasets need a tiler"
      );

      expect(prisma.dataset.create).not.toHaveBeenCalled();
      expect(prisma.area.findUnique).not.toHaveBeenCalled();
      expect(startCountProbe).not.toHaveBeenCalled();
    });

    it("still returns a dataset that exists", async () => {
      mockDatasetFindFirst.mockResolvedValueOnce(existingDatasetRow as never);

      const { dataset, wasCreated } = await getOrCreateDataset(1, "test-template", "en");

      expect(wasCreated).toBe(false);
      expect(dataset.id).toBe("ds-1");
    });
  });
});
