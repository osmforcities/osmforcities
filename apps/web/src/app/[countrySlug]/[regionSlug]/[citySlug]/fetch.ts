import { cache } from "react";
import prisma from "@/app/db";

export const revalidate = 3600; // revalidate the data at most every hour

export interface City {
  name: string;
  gitUrl: string;
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

    const presetsWithSingleStats = presets.map((preset) => ({
      ...preset,
      CityPresetStats: preset.CityPresetStats[0] || null,
    }));

    return {
      name: city.name,
      gitUrl: `https://github.com/osmforcities/${process.env.GIT_REPOSITORY_NAME}/blob/main/${city.region.code}/${city.name_slug}`,
      country: {
        name: city.region.country.name,
        url: `/${city.region.country.name_slug}`,
      },
      region: {
        name: city.region.name,
        url: `/${city.region.country.name_slug}/${city.region.name_slug}`,
      },
      stats: city.stats,
      presets: presetsWithSingleStats,
    };
  }
);
