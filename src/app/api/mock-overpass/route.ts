import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { mockOverpassResponse } from "@/lib/mocks/overpass";
import { mockTilerState } from "@/lib/mocks/tiler";

const jsonResponse = (data: unknown) =>
  NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });

const elementsResponse = () =>
  jsonResponse(
    mockTilerState().overpassEmpty
      ? { ...mockOverpassResponse, elements: [] }
      : mockOverpassResponse
  );

const countResponse = () => {
  const state = mockTilerState();
  const total = state.overpassEmpty
    ? 0
    : (state.overpassCount ?? mockOverpassResponse.elements.length);
  return jsonResponse({
    version: 0.6,
    generator: "Overpass API",
    elements: [{ type: "count", id: 0, tags: { total: String(total) } }],
  });
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  // Size pre-flight queries end in "out count;" and expect a count payload
  if (decodeURIComponent(body).includes("out count;")) {
    const state = mockTilerState();
    state.countProbes++;
    if (state.countTimesOut) return new NextResponse(null, { status: 504 });
    return countResponse();
  }
  mockTilerState().featureFetches++;
  // A real Overpass result file, for a real tiler to bake (smoke runs only)
  const realData = process.env.MOCK_OVERPASS_DATA_FILE;
  if (realData) {
    return new NextResponse(await readFile(realData), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return elementsResponse();
}

export async function GET() {
  return elementsResponse();
}
