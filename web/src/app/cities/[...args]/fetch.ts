import { cache } from "react";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const revalidate = 3600; // revalidate the data at most every hour

export interface City {
  name: string;
  country: {
    name: string;
    urlPath: string;
  };
  region: {
    name: string;
    urlPath: string;
  };
}

export const fetchCityFromPath = cache(
  async (args: [string, string, string]): Promise<City | null> => {
    const [countryCode, regionCode, nameSlug] = args;

    const city = await prisma.city.findFirst({
      where: {
        name_slug: nameSlug,
        region: {
          code: regionCode,
          country: {
            code: countryCode,
          },
        },
      },
      include: {
        region: {
          include: {
            country: true,
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
        urlPath: `/cities/${city.region.country.code}`,
      },
      region: {
        name: city.region.name,
        urlPath: `/cities/${city.region.country.code}/${city.region.code}`,
      },
    };
  }
);
