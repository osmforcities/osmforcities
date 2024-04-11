import "server-only";
import prisma from "./db";
import { City } from "@prisma/client";

type GetCityParams = {
  countrySlug: string;
  regionSlug: string;
  citySlug: string;
};

export const getCity = async ({
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
};
