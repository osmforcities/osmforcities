import { NextRequest, NextResponse } from "next/server";
import { mockOverpassResponse } from "@/lib/mocks/overpass";

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
        tags: { total: String(mockOverpassResponse.elements.length) },
      },
    ],
  });

export async function POST(req: NextRequest) {
  const body = await req.text();
  // Size pre-flight queries end in "out count;" and expect a count payload
  if (decodeURIComponent(body).includes("out count;")) {
    return countResponse();
  }
  return jsonResponse(mockOverpassResponse);
}

export async function GET() {
  return jsonResponse(mockOverpassResponse);
}
