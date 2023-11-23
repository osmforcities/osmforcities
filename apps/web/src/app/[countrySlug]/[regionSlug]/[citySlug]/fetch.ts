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
  presets: any[];
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

    const presets = await prisma.preset.findMany({
      where: {
        CityPresetStats: {
          some: {
            city: {
              id: city.id,
            },
          },
        },
      },
      include: {
        CityPresetStats: {
          take: 1,
          orderBy: {
            updatedAt: "desc",
          },
        },
      },
    });

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
      presets: presets.map((preset) => ({
        name: preset.name,
        url: `/${city.region.country.name_slug}/${city.region.name_slug}/${city.name_slug}/${preset.name_slug}`,
        ...preset.CityPresetStats[0],
      })),
    };
  }
);
