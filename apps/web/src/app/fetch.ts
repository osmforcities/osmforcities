import { cache } from "react";
import prisma from "@/app/db";
export const revalidate = 3600;

interface Change {
  cityName: string;
  cityUrl: string;
  presetName: string;
  presetUrl: string;
  updatedAt: Date;
}

export const fetchLatestChanges = cache(async (): Promise<Change[]> => {
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
});
