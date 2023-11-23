import { cache } from "react";
import prisma from "@/app/db";

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
        stats: {
          take: 10,
          orderBy: {
            date: "desc", // Sorting stats by 'date' in descending order
          },
        },
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
      stats: city.stats,
    };
  }
);
