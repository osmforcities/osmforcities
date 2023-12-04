import "server-only";
import { cache } from "react";
import prisma from "@/app/utils/db";
import { Country } from "@prisma/client";

export const revalidate = 3600;

type GetCountryParams = {
  countrySlug: string;
};

export const getCountry = cache(
  async ({ countrySlug }: GetCountryParams): Promise<Country | null> => {
    const country = await prisma.country.findFirst({
      where: {
        name_slug: countrySlug,
      },
    });

    if (!country) {
      return null;
    }

    return country as Country;
  }
);
