import { cache } from "react";
import { CityStats } from "@prisma/client";

import prisma from "@/app/db";

export const revalidate = 3600;

export interface Region {
  name: string;
  country: {
    name: string;
    url: string;
  };
  cities: {
    name: string;
    url: string;
    stats?: CityStats;
  }[];
}

export const fetchRegion = cache(
  async ({
    countrySlug,
    regionSlug,
  }: {
    countrySlug: string;
    regionSlug: string;
  }): Promise<Region | null> => {
    const region = await prisma.region.findFirst({
      where: {
        country: {
          name_slug: countrySlug,
        },
        name_slug: regionSlug,
      },
      include: {
        country: true,
        cities: {
          select: {
            name: true,
            name_slug: true,
            CityStats: {
              take: 1,
              orderBy: {
                date: "desc",
              },
            },
          },
        },
      },
    });

    if (!region) {
      return null;
    }

    return {
      name: region.name,
      country: {
        name: region.country.name,
        url: `/${region.country.name_slug}`,
      },
      cities: region.cities.map((city) => ({
        name: city.name,
        url: `/${region.country.name_slug}/${region.name_slug}/${city.name_slug}`,
        stats: city.CityStats[0],
      })),
    };
  }
);