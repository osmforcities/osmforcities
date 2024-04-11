import prisma from "@/app/utils/db";
import { City, CityPresetStats, Preset, Region } from "@prisma/client";
import { getCityPresetGeojsonGitUrl } from "@/app/utils/git-url";
import type { FeatureCollection } from "geojson";

export const fetchCityPresetGeojson = async ({
  region,
  city,
  preset,
}: {
  region: Region;
  city: City;
  preset: Preset;
}): Promise<FeatureCollection | null> => {
  const geojsonUrl = getCityPresetGeojsonGitUrl(region, city, preset);

  let geojson: FeatureCollection | null = null;

  try {
    geojson = await fetch(geojsonUrl).then((res) => res.json());
  } catch (error) {
    // eslint-disable-next-line
    console.log(
      "An error occurred while fetching geojson for city preset",
      geojsonUrl
    );
  }

  return geojson;
};

export const fetchLatestCityPresetStatus = async ({
  city,
  preset,
}: {
  city: City;
  preset: Preset;
}): Promise<CityPresetStats | null> => {
  return await prisma.cityPresetStats.findFirst({
    where: {
      cityId: city.id,
      presetId: preset.id,
    },
    take: 1,
    orderBy: {
      updatedAt: "desc",
    },
  });
};
