import { cache } from "react";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const revalidate = 3600;

export interface Country {
  name: string;
}

export const fetchCountry = cache(
  async (countrySlug: string): Promise<Country | null> => {
    const country = await prisma.country.findFirst({
      where: {
        name_slug: countrySlug,
      },
    });

    if (!country) {
      return null;
    }

    return {
      name: country.name,
    };
  }
);
