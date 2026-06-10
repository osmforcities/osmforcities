import { describe, it, expect } from "vitest";
import { fromNominatim, fromOverpass, InvalidAreaError } from "@/lib/area-conversion";
import type { NominatimResult } from "@/schemas/nominatim";
import type { OSMRelation } from "@/types/osm";

// Realistic Nominatim response for a city (Lisbon-style)
const mockNominatimCity: NominatimResult = {
  osm_id: 1234567,
  osm_type: "relation",
  class: "boundary",
  type: "administrative",
  addresstype: "city",
  name: "Lisbon",
  display_name: "Lisbon, Portugal",
  boundingbox: ["38.6915", "38.7915", "-9.2205", "-9.1205"],
  lat: "38.7",
  lon: "-9.1",
  place_id: 12345,
  address: {
    city: "Lisbon",
    country: "Portugal",
    country_code: "PT",
  },
};

// Nominatim result with missing optional fields
const mockNominatimMinimal: NominatimResult = {
  osm_id: 7654321,
  osm_type: "relation",
  class: "boundary",
  type: "administrative",
  addresstype: "city",
  name: "Test City",
  display_name: "Test City",
  boundingbox: ["40.0", "41.0", "-8.0", "-7.0"],
  lat: "40.5",
  lon: "-7.5",
  place_id: 54321,
  address: {},
};

describe("fromNominatim", () => {
  it("converts valid Nominatim result to Area", () => {
    const area = fromNominatim(mockNominatimCity);

    expect(area.id).toBe(1234567);
    expect(area.name).toBe("Lisbon");
    expect(area.displayName).toBe("Lisbon, Portugal");
    expect(area.osmType).toBe("relation");
    expect(area.class).toBe("boundary");
    expect(area.type).toBe("administrative");
    expect(area.addresstype).toBe("city");
    expect(area.countryCode).toBe("pt"); // lowercase
    expect(area.country).toBe("Portugal");
  });

  it("reorders bbox from [minLat, maxLat, minLon, maxLon] to [minLat, minLon, maxLat, maxLon]", () => {
    const area = fromNominatim(mockNominatimCity);

    // Nominatim bbox: ["38.6915", "38.7915", "-9.2205", "-9.1205"]
    // Expected: [minLat, minLon, maxLat, maxLon]
    expect(area.boundingBox).toEqual([38.6915, -9.2205, 38.7915, -9.1205]);
  });

  it("throws InvalidAreaError for invalid id (zero)", () => {
    const invalidResult = { ...mockNominatimCity, osm_id: 0 };
    expect(() => fromNominatim(invalidResult)).toThrow(InvalidAreaError);
    expect(() => fromNominatim(invalidResult)).toThrow("Invalid area id");
  });

  it("throws InvalidAreaError for invalid id (negative)", () => {
    const invalidResult = { ...mockNominatimCity, osm_id: -1 };
    expect(() => fromNominatim(invalidResult)).toThrow(InvalidAreaError);
    expect(() => fromNominatim(invalidResult)).toThrow("Invalid area id");
  });

  it("throws InvalidAreaError for invalid bbox (wrong length)", () => {
    const invalidResult = { ...mockNominatimCity, boundingbox: ["38.0", "39.0"] };
    expect(() => fromNominatim(invalidResult)).toThrow(InvalidAreaError);
    expect(() => fromNominatim(invalidResult)).toThrow("Invalid bounding box");
  });

  it("throws InvalidAreaError for invalid bbox (out of range latitude)", () => {
    const invalidResult = { ...mockNominatimCity, boundingbox: ["-91.0", "91.0", "-9.0", "-8.0"] };
    expect(() => fromNominatim(invalidResult)).toThrow(InvalidAreaError);
    expect(() => fromNominatim(invalidResult)).toThrow("Invalid bounding box");
  });

  it("throws InvalidAreaError for invalid bbox (out of range longitude)", () => {
    const invalidResult = { ...mockNominatimCity, boundingbox: ["38.0", "39.0", "-181.0", "-180.0"] };
    expect(() => fromNominatim(invalidResult)).toThrow(InvalidAreaError);
    expect(() => fromNominatim(invalidResult)).toThrow("Invalid bounding box");
  });

  it("handles missing optional fields with undefined", () => {
    const area = fromNominatim(mockNominatimMinimal);

    expect(area.countryCode).toBeUndefined();
    expect(area.country).toBeUndefined();
    expect(area.state).toBeUndefined();
  });

  it("includes state field when present in address", () => {
    const resultWithState: NominatimResult = {
      ...mockNominatimCity,
      address: {
        ...mockNominatimCity.address,
        state: "Lisbon District",
      },
    };

    const area = fromNominatim(resultWithState);
    expect(area.state).toBe("Lisbon District");
  });

  it("trims whitespace from names", () => {
    const resultWithSpaces: NominatimResult = {
      ...mockNominatimCity,
      name: "  Lisbon  ",
      display_name: "  Lisbon, Portugal  ",
    };

    const area = fromNominatim(resultWithSpaces);
    expect(area.name).toBe("Lisbon");
    expect(area.displayName).toBe("Lisbon, Portugal");
  });

  it("falls back to display_name when name is empty", () => {
    const resultWithEmptyName: NominatimResult = {
      ...mockNominatimCity,
      name: "",
      display_name: "Lisbon, Portugal",
    };

    const area = fromNominatim(resultWithEmptyName);
    expect(area.name).toBe("Lisbon"); // Falls back to first part of display_name
  });
});

describe("fromOverpass", () => {
  const mockOSMRelation: OSMRelation = {
    type: "relation",
    id: 9876543,
    tags: {
      name: "Paris",
      type: "boundary",
      boundary: "administrative",
    },
    bounds: {
      minlat: 48.8155,
      maxlat: 48.9021,
      minlon: 2.2241,
      maxlon: 2.4699,
    },
  };

  it("converts valid Overpass relation to Area", () => {
    const area = fromOverpass(mockOSMRelation, mockOSMRelation.tags, mockOSMRelation.bounds);

    expect(area.id).toBe(9876543);
    expect(area.name).toBe("Paris");
    expect(area.displayName).toBe("Paris"); // Falls back to name
    expect(area.osmType).toBe("relation");
  });

  it("reorders bbox from bounds to [minLat, minLon, maxLat, maxLon]", () => {
    const area = fromOverpass(mockOSMRelation, mockOSMRelation.tags, mockOSMRelation.bounds);

    expect(area.boundingBox).toEqual([48.8155, 2.2241, 48.9021, 2.4699]);
  });

  it("throws InvalidAreaError for invalid id", () => {
    const invalidRelation = { ...mockOSMRelation, id: 0 };
    expect(() => fromOverpass(invalidRelation, mockOSMRelation.tags, mockOSMRelation.bounds)).toThrow(InvalidAreaError);
  });

  it("throws InvalidAreaError for invalid bbox", () => {
    const invalidBounds = { minlat: -91.0, maxlat: 91.0, minlon: 2.0, maxlon: 3.0 };
    expect(() => fromOverpass(mockOSMRelation, mockOSMRelation.tags, invalidBounds)).toThrow(InvalidAreaError);
  });

  it("handles undefined tags gracefully", () => {
    const area = fromOverpass(mockOSMRelation, undefined, mockOSMRelation.bounds);
    expect(area.name).toBe("");
    expect(area.class).toBe("");
  });
});
