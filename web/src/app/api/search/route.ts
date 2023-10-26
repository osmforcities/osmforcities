import { type NextRequest } from "next/server";

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const normalizeInput = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");

  if (!q) {
    return Response.json({ results: [] });
  }

  const normalizedQuery = normalizeInput(q.toLowerCase());

  const results = await prisma.cities.findMany({
    where: {
      name_normalized: {
        contains: normalizedQuery,
      },
    },
    orderBy: {
      is_capital: "desc",
    },
    take: 10,
  });

  return Response.json({ results });
}
