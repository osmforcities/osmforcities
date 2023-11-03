import { cache } from "react";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const revalidate = 3600; // revalidate the data at most every hour

export interface City {
  name: string;
  country: {
    name: string;
    url: string;
  };
  region: {
    name: string;
    url: string;
  };
  stats: any[];
}

export const fetchCity = cache(
  async ({
    countrySlug,
    regionSlug,
    citySlug,
  }: {
    countrySlug: string;
    regionSlug: string;
    citySlug: string;
  }): Promise<City | null> => {
    const city = await prisma.city.findFirst({
      where: {
        name_slug: citySlug,
        region: {
          name_slug: regionSlug,
          country: {
            name_slug: countrySlug,
          },
        },
      },
      include: {
        region: {
          include: {
            country: true,
          },
        },
        CityStats: true,
      },
    });

    if (!city) {
      return null;
    }

    return {
      name: city.name,
      country: {
        name: city.region.country.name,
        url: `/${city.region.country.name_slug}`,
      },
      region: {
        name: city.region.name,
        url: `/${city.region.country.name_slug}/${city.region.name_slug}`,
      },
      stats: city.CityStats,
    };
  }
);
