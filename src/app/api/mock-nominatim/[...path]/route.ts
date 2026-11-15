import { NextRequest, NextResponse } from "next/server";
import { isTestAuthEnabled } from "@/lib/test-auth";
import {
  mockNominatimLookup,
  mockNominatimSearch,
  type MockNominatimResponse,
} from "@/lib/mocks/nominatim";

type Context = { params: Promise<{ path: string[] }> };

const toResponse = ({ status, body }: MockNominatimResponse) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest, { params }: Context) {
  if (!isTestAuthEnabled()) return new NextResponse(null, { status: 404 });
  const query = request.nextUrl.searchParams;
  switch ((await params).path.join("/")) {
    case "search":
      return toResponse(mockNominatimSearch(query.get("q") ?? ""));
    case "lookup":
      return toResponse(mockNominatimLookup(query.get("osm_ids") ?? ""));
    default:
      return new NextResponse(null, { status: 404 });
  }
}
