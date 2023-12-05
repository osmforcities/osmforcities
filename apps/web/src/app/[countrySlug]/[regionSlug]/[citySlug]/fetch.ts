import { cache } from "react";
import prisma from "@/app/utils/db";
import { City, CityPresetStats, Preset } from "@prisma/client";

export const revalidate = 3600; // revalidate the data at most every hour

export interface CityPresetStatsWithPreset extends CityPresetStats {
  preset: Preset;
}

export const fetchCityPresetsStats = cache(
  async ({ city }: { city: City }): Promise<CityPresetStatsWithPreset[]> => {
    const cityPresetStats = await prisma.cityPresetStats.findMany({
      where: {
        cityId: city.id,
      },
      include: {
        preset: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return cityPresetStats as CityPresetStatsWithPreset[];
  }
);
