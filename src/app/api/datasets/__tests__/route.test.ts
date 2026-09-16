import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { fetchDatasetSnapshot } from "@/lib/dataset-snapshot";
import { submitTilesForDataset } from "@/lib/tiler/submit";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    template: { findUnique: vi.fn() },
    area: { findUnique: vi.fn() },
    dataset: { create: vi.fn() },
  },
}));

vi.mock("@/lib/area-refresh", () => ({
  refreshAreaInfoIfStale: vi.fn(async (area: unknown) => area),
  resolveAreaCenter: vi.fn(),
}));

vi.mock("@/lib/umami", () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
  getClientInfo: vi.fn(),
}));

vi.mock("@/lib/tiler/submit", () => ({ submitTilesForDataset: vi.fn() }));

// Real snapshotDatasetColumns: the column write is part of the contract.
vi.mock("@/lib/dataset-snapshot", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dataset-snapshot")>()),
  fetchDatasetSnapshot: vi.fn(),
}));

import { POST } from "../route";

const probeCount = 3_000_000;

const call = () =>
  POST(
    new NextRequest("http://localhost:3000/api/datasets", {
      method: "POST",
      body: JSON.stringify({ templateId: "tpl-1", osmRelationId: 47798 }),
    })
  );

describe("POST /api/datasets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "user@test.com" },
    } as never);
    vi.mocked(prisma.template.findUnique).mockResolvedValue({
      id: "tpl-1",
      overpassQuery: "q",
    } as never);
    vi.mocked(prisma.area.findUnique).mockResolvedValue({
      id: 47798,
      name: "Sao Paulo",
    } as never);
    // Echo the write back the way the DB would return it.
    vi.mocked(prisma.dataset.create).mockImplementation((async ({
      data,
    }: {
      data: Record<string, unknown>;
    }) => ({
      id: "ds-1",
      ...data,
      geojson: data.geojson === Prisma.JsonNull ? null : data.geojson,
      tilesState: null,
      tilesJobId: null,
    })) as never);
    vi.mocked(submitTilesForDataset).mockResolvedValue({
      tilesState: "pending",
      tilesJobId: "ds-1-1",
      tilesError: null,
    });
  });

  it("creates an over-cap dataset on the tiles-only lane: 201, pending, no geojson", async () => {
    vi.mocked(fetchDatasetSnapshot).mockResolvedValue({
      tilesOnly: true,
      geojson: null,
      stats: null,
      bbox: null,
      dataCount: probeCount,
    });

    const res = await call();

    expect(res.status).toBe(201);
    const { data } = vi.mocked(prisma.dataset.create).mock.calls[0][0];
    expect(data.geojson).toBe(Prisma.JsonNull);
    expect(data.dataCount).toBe(probeCount);
    const body = await res.json();
    expect(body.geojson).toBeNull();
    expect(body.tilesState).toBe("pending");
    expect(body.tilesJobId).toBe("ds-1-1");
    expect(submitTilesForDataset).toHaveBeenCalledWith("ds-1");
  });
});
