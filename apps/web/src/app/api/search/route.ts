import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/app/utils/db";

export interface SearchResult {
  type: "city" | "region" | "country";
  label: string;
  url: string;
  name: string;
  name_normalized: string;
  name_slug: string;
}

interface SearchResults {
  results: SearchResult[];
}

const normalizeInput = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ results: [] } as SearchResults);
  }

  const normalizedQuery = normalizeInput(q.toLowerCase());

  const cities = await prisma.city.findMany({
    where: {
      name_normalized: {
        contains: normalizedQuery,
      },
    },
    select: {
      name: true,
      name_normalized: true,
      name_slug: true,
      region: {
        select: {
          code: true,
          name_slug: true,
          country: {
            select: {
              name_slug: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      is_capital: "desc",
    },
    take: 10,
  });

  const results: SearchResult[] = cities.map(
    ({ name, name_normalized, name_slug, region }) => ({
      type: "city",
      label: `${name} (${region.code.toUpperCase()}), ${region.country.name}`,
      url: `/${region.country.name_slug}/${region.name_slug}/${name_slug}`,
      name,
      name_normalized,
      name_slug,
    })
  );

  return NextResponse.json({ results } as SearchResults);
}
