import { cache } from "react";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const revalidate = 3600;

export interface Country {
  name: string;
  regions: {
    name: string;
    url: string;
  }[];
}

export const fetchCountry = cache(
  async (countrySlug: string): Promise<Country | null> => {
    const country = await prisma.country.findFirst({
      where: {
        name_slug: countrySlug,
      },
      include: {
        regions: {
          select: {
            name: true,
            name_slug: true,
          },
        },
      },
    });

    if (!country) {
      return null;
    }

    return {
      name: country.name,
      regions: country.regions.map((region) => ({
        name: region.name,
        url: `/${country.name_slug}/${region.name_slug}`,
      })),
    };
  }
);
