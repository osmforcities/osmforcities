import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { mockOverpassResponse } from "@/lib/mocks/overpass";
import { mockTilerState } from "@/lib/mocks/tiler";

// Copied from overpass-pmtiler's fixtures
const DELFT_PARKS =path.join(process.cwd(), "tests/fixtures/delft-parks.json");

const jsonResponse = (data: unknown) =>
  NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });

const countResponse = () =>
  jsonResponse({
    version: 0.6,
    generator: "Overpass API",
    elements: [
      {
        type: "count",
        id: 0,
        tags: {
          total: String(
            mockTilerState().overpassCount ??
              mockOverpassResponse.elements.length
          ),
        },
      },
    ],
  });

export async function POST(req: NextRequest) {
  const body = await req.text();
  // Size pre-flight queries end in "out count;" and expect a count payload
  if (decodeURIComponent(body).includes("out count;")) {
    const state = mockTilerState();
    state.countProbes++;
    if (state.countTimesOut) return new NextResponse(null, { status: 504 });
    return countResponse();
  }
  if (mockTilerState().realOverpassData) {
    return new NextResponse(await readFile(DELFT_PARKS), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return jsonResponse(mockOverpassResponse);
}

export async function GET() {
  return jsonResponse(mockOverpassResponse);
}
