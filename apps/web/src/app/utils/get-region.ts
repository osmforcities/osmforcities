import "server-only";
import { cache } from "react";
import prisma from "./db";
import { Region } from "@prisma/client";

type GetRegionParams = {
  countrySlug: string;
  regionSlug: string;
};

export const getRegion = cache(
  async ({
    countrySlug,
    regionSlug,
  }: GetRegionParams): Promise<Region | null> => {
    const region = await prisma.region.findFirst({
      where: {
        name_slug: regionSlug,
        country: {
          name_slug: countrySlug,
        },
      },
    });

    if (!region) {
      return null;
    }

    return region as Region;
  }
);
