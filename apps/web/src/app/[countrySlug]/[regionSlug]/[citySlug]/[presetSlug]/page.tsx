import { getCity } from "@/app/utils/get-city";
import { getCountry } from "@/app/utils/get-country";
import { getPreset } from "@/app/utils/get-preset";
import { getRegion } from "@/app/utils/get-region";
import { notFound } from "next/navigation";
import Map from "@/app/components/map";
import { fetchCityPresetGeojson, fetchLatestCityPresetStatus } from "./fetch";
import { GLOBAL_REVALIDATION_TIME } from "@/constants";

import React from "react";
import PresetInfoTable from "./info-table";
import FeatureList from "./feature-table";
import Heading from "@/app/components/headings";
import { Separator } from "@/app/components/common";
import { Button } from "@/app/components/button";
import { getCityPresetGeojsonGitUrl } from "@/app/utils/git-url";
import { BackLink } from "@/app/components/link";

type CityPagePageProps = {
  params: {
    countrySlug: string;
    regionSlug: string;
    citySlug: string;
    presetSlug: string;
  };
};

const Panel = ({ id, children }: { id: string; children: React.ReactNode }) => {
  return (
    <section
      id={id}
      className="w-[32rem] flex flex-col"
      style={{ height: "calc(100vh - var(--nav-height))" }}
    >
      <div className="flex-1 overflow-hidden flex flex-col pl-6 pr-3">
        {children}
      </div>
    </section>
  );
};

const CityPresetPage = async (props: CityPagePageProps) => {
  const { countrySlug, regionSlug, citySlug, presetSlug } = props.params;

  const [country, region, city, preset] = await Promise.all([
    getCountry({
      countrySlug,
    }),
    getRegion({
      countrySlug,
      regionSlug,
    }),
    getCity({
      countrySlug,
      regionSlug,
      citySlug,
    }),
    getPreset({
      presetSlug,
    }),
  ]);

  if (!country || !region || !city || !preset) {
    return notFound();
  }

  const latestStatus = await fetchLatestCityPresetStatus({
    city,
    preset,
  });

  const geojson = await fetchCityPresetGeojson({ region, city, preset });

  const totalChanges =
    geojson?.features?.reduce(
      (acc, f) => (f.properties?.version ? acc + f.properties.version : acc),
      0
    ) || 0;

  return (
    <div className="flex">
      <Panel id="right-panel">
        <div>
          <BackLink
            href={`/${country.name_slug}/${region.name_slug}/${city.name_slug}`}
          >
            all city datasets
          </BackLink>

          <Heading level={2} size="medium">
            {preset.name} in {city.name}
          </Heading>

          <Separator />

          <PresetInfoTable
            preset={preset}
            latestStatus={latestStatus}
            totalChanges={totalChanges}
            region={region}
            city={city}
          />

          <Separator />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {geojson ? (
            <FeatureList geojson={geojson} />
          ) : (
            <div>
              <h1>{preset.name}</h1>
              <p>There is no data for this preset yet.</p>
            </div>
          )}
        </div>

        <div className="pb-8">
          <Separator />
          <div className="mt-4 flex justify-center">
            <Button href={getCityPresetGeojsonGitUrl(region, city, preset)}>
              Download
            </Button>
          </div>
        </div>
      </Panel>
      <Map geojson={geojson} />
    </div>
  );
};

export default CityPresetPage;

export const revalidate = GLOBAL_REVALIDATION_TIME;
