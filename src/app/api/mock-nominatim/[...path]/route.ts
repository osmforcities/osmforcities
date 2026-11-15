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
  const [endpoint, ...rest] = (await params).path;
  const query = request.nextUrl.searchParams;
  if (endpoint === "search" && !rest.length) {
    return toResponse(mockNominatimSearch(query.get("q") ?? ""));
  }
  if (endpoint === "lookup" && !rest.length) {
    return toResponse(mockNominatimLookup(query.get("osm_ids") ?? ""));
  }
  return new NextResponse(null, { status: 404 });
}
