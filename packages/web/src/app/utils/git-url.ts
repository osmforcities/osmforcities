import { Region, City, Preset } from "@prisma/client";

type GitViewType = "blob" | "raw" | "history";

export const getCityPresetGeojsonGitUrl = (
  region: Region,
  city: City,
  preset: Preset,
  viewType?: GitViewType
): string => {
  if (viewType === "blob") {
    return `https://github.com/osmforcities/${process.env.GIT_REPOSITORY_NAME}/blob/main/${region.code}/${city.name_slug}/${preset.name_slug}.geojson`;
  } else if (viewType === "history") {
    return `https://github.com/osmforcities/${process.env.GIT_REPOSITORY_NAME}/commits/main/${region.code}/${city.name_slug}/${preset.name_slug}.geojson`;
  } else {
    return `https://raw.githubusercontent.com/osmforcities/${process.env.GIT_REPOSITORY_NAME}/main/${region.code}/${city.name_slug}/${preset.name_slug}.geojson`;
  }
};
