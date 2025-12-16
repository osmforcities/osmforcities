import { NextResponse } from "next/server";
import { mockOverpassResponse } from "@/lib/mocks/overpass";

const handleRequest = () =>
  NextResponse.json(mockOverpassResponse, {
    headers: {
      "Cache-Control": "no-store",
    },
  });

export async function POST() {
  return handleRequest();
}

export async function GET() {
  return handleRequest();
}
