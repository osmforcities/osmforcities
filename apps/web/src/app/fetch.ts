import prisma from "@/app/utils/db";
import { FEATURE_COUNT_ON_FEATURED_DATASETS } from "@/constants";

export interface Change {
  cityName: string;
  cityUrl: string;
  presetName: string;
  presetUrl: string;
  featureCount: number;
  requiredTagsCoverage: number;
  updatedAt: Date;
}

export const fetchLatestChanges = async (): Promise<Change[]> => {
  const changes = await prisma.cityPresetStats.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    take: 10,
    include: {
      preset: {
        select: {
          name: true,
          name_slug: true,
        },
      },
      city: {
        select: {
          name: true,
          name_slug: true,
          region: {
            select: {
              name: true,
              name_slug: true,
              code: true,
              country: {
                select: {
                  name: true,
                  name_slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return changes.map((c) => {
    return {
      cityName: `${c.city.name}, ${c.city.region.code.toUpperCase()}`,
      cityUrl: `/${c.city.region.country.name_slug}/${c.city.region.name_slug}/${c.city.name_slug}`,
      presetName: c.preset.name,
      presetUrl: `/${c.city.region.country.name_slug}/${c.city.region.name_slug}/${c.city.name_slug}/${c.preset.name_slug}`,
      updatedAt: c.updatedAt,
    };
  }) as Change[];
};

export async function fetchFeaturedDatasetsByCategory(filter: {
  countrySlug?: string;
  regionSlug?: string;
}) {
  const categories = await prisma.preset.findMany({
    select: {
      category: true,
    },
    distinct: ["category"],
  });

  const featuredDatasets = await Promise.all(
    categories.map(async (category) => {
      return {
        category: category.category,
        datasets: await fetchFeaturedDatasets({
          category: category.category,
          countrySlug: filter.countrySlug || undefined,
          regionSlug: filter.regionSlug || undefined,
        }),
      };
    })
  );

  return featuredDatasets;
}

export async function fetchFeaturedDatasets({
  category,
  countrySlug,
  regionSlug,
}: {
  category: string;
  countrySlug?: string;
  regionSlug?: string;
}) {
  const changes = await prisma.cityPresetStats.findMany({
    orderBy: {
      requiredTagsCoverage: "desc",
    },
    where: {
      totalFeatures: {
        gt: FEATURE_COUNT_ON_FEATURED_DATASETS,
      },
      NOT: {
        preset: {
          required_tags: {
            equals: [],
          },
        },
      },
      preset: {
        category: {
          equals: category,
        },
      },
      city: {
        region: {
          name_slug: regionSlug || undefined,
          country: {
            name_slug: countrySlug || undefined,
          },
        },
      },
    },
    take: 10,
    include: {
      preset: {
        select: {
          name: true,
          name_slug: true,
        },
      },
      city: {
        select: {
          name: true,
          name_slug: true,
          region: {
            select: {
              name: true,
              name_slug: true,
              code: true,
              country: {
                select: {
                  name: true,
                  name_slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return changes.map((c) => {
    return {
      cityName: `${c.city.name}, ${c.city.region.code.toUpperCase()}`,
      cityUrl: `/${c.city.region.country.name_slug}/${c.city.region.name_slug}/${c.city.name_slug}`,
      presetName: c.preset.name,
      presetUrl: `/${c.city.region.country.name_slug}/${c.city.region.name_slug}/${c.city.name_slug}/${c.preset.name_slug}`,
      featureCount: c.totalFeatures,
      requiredTagsCoverage: c.requiredTagsCoverage,
      updatedAt: c.updatedAt,
    };
  }) as Change[];
}
