import "server-only";
import { cache } from "react";
import prisma from "./db";
import { City } from "@prisma/client";

export const revalidate = 3600;

type GetCityParams = {
  countrySlug: string;
  regionSlug: string;
  citySlug: string;
};

export const getCity = cache(
  async ({
    countrySlug,
    regionSlug,
    citySlug,
  }: GetCityParams): Promise<City | null> => {
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
    });

    if (!city) {
      return null;
    }

    return city as City;
  }
);
