import { cache } from "react";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const revalidate = 3600; // revalidate the data at most every hour

export const getCityBySlug = cache(async (args: string[]) => {
  const [countryCode, regionCode, nameSlug] = args;

  // fetch city
  const city = await prisma.cities.findFirst({
    where: {
      name_slug: nameSlug,
      region_code: regionCode,
      country_code: countryCode,
    },
    include: {
      regions: true,
      regions: {
        include: {
          countries: true, // Include the related country of that region
        },
      },
    },
  });
  return city;
});
