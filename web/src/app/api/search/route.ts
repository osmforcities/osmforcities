import { type NextRequest } from "next/server";
import DbAdapter from "../../db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");

  if (!q) {
    return Response.json({ results: [] });
  }

  const db = new DbAdapter();
  await db.connect();

  const results = await db.search(q as string);

  return Response.json({ results });
}
