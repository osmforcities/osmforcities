import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Feature } from "geojson";
import { fullTagsTile, readFullTags, withFullTags } from "../tiles-full-tags";

// z14 tile 8413/5383 of a real Amsterdam bicycle parking bake
const fixture = readFileSync(
  join(__dirname, "fixtures/amsterdam-bicycle-parking-z14.pbf")
);
const parking = { lng: 4.8681296, lat: 52.3809987 };

const archiveWith = (data: ArrayBuffer | undefined) => ({
  getZxy: vi.fn(async () => (data ? { data } : undefined)),
});
const fixtureBytes = () =>
  fixture.buffer.slice(
    fixture.byteOffset,
    fixture.byteOffset + fixture.byteLength
  );

describe("fullTagsTile", () => {
  it("puts the origin at the centre of the z14 grid", () => {
    expect(fullTagsTile(0, 0)).toEqual({ x: 8192, y: 8192 });
  });

  it("finds the tile under an Amsterdam point", () => {
    expect(fullTagsTile(parking.lng, parking.lat)).toEqual({
      x: 8413,
      y: 5383,
    });
  });
});

describe("readFullTags", () => {
  it("returns every tag of the feature from the z14 tile", async () => {
    const archive = archiveWith(fixtureBytes());

    const tags = await readFullTags(archive, parking, "node/12104088569");

    expect(archive.getZxy).toHaveBeenCalledWith(14, 8413, 5383);
    expect(tags).toMatchObject({
      "@id": "node/12104088569",
      amenity: "bicycle_parking",
      bicycle_parking: "wall_loops",
      capacity: "40",
      covered: "no",
    });
  });

  it("is null when the tile lacks the feature", async () => {
    expect(
      await readFullTags(archiveWith(fixtureBytes()), parking, "node/1")
    ).toBeNull();
  });

  it("is null when the archive has no tile there", async () => {
    expect(
      await readFullTags(archiveWith(undefined), parking, "node/12104088569")
    ).toBeNull();
  });
});

describe("withFullTags", () => {
  const drawn: Feature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [parking.lng, parking.lat] },
    properties: {
      "@id": "node/12104088569",
      id: "node/12104088569",
      bicycle_parking: "wall_loops",
    },
  };

  it("swaps in the full tags and keeps geometry and id", async () => {
    const full = await withFullTags(drawn, archiveWith(fixtureBytes()), parking);

    expect(full?.geometry).toBe(drawn.geometry);
    expect(full?.properties).toMatchObject({
      id: "node/12104088569",
      amenity: "bicycle_parking",
    });
  });

  it("is null without an archive", async () => {
    expect(await withFullTags(drawn, null, parking)).toBeNull();
  });

  it("is null when the tile read fails", async () => {
    const archive = {
      getZxy: vi.fn(async () => {
        throw new Error("network");
      }),
    };
    expect(await withFullTags(drawn, archive, parking)).toBeNull();
  });
});
