import Breadcrumbs from "@/app/components/breadcrumbs";
import { getCity } from "@/app/utils/get-city";
import { getCountry } from "@/app/utils/get-country";
import { getPreset } from "@/app/utils/get-preset";
import { getRegion } from "@/app/utils/get-region";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchCityPresetGeojson, fetchLatestCityPresetStatus } from "./fetch";
import { GLOBAL_REVALIDATION_TIME } from "@/constants";

const Map = dynamic(() => import("@/app/components/map"), {
  ssr: false,
});

import React from "react";
import PresetInfoTable from "./info-table";
import FeatureList from "./feature-table";

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
    <section id={id} className="w-64 py-5 px-3">
      {children}
    </section>
  );
};

const Indicators = ({
  latestStatus,
}: {
  latestStatus: {
    totalFeatures: number;
    totalChangesets: number;
  };
}) => {
  return (
    <div className="flex py-2 justify-between items-center">
      <div className="text-center">
        <div>{latestStatus?.totalFeatures || "-"}</div>
        <div>Features</div>
      </div>
      <div className="text-center">
        <div>{latestStatus?.totalChangesets || "-"}</div>
        <div>Changesets</div>
      </div>
    </div>
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
        <Breadcrumbs
          breadcrumbs={[
            { label: country.name, url: `/${country.name_slug}` },
            {
              label: region.name,
              url: `/${country.name_slug}/${region.name_slug}`,
            },
            {
              label: city.name,
              url: `/${country.name_slug}/${region.name_slug}/${city.name_slug}`,
            },
            { label: preset.name, isLast: true },
          ]}
        />

        <div>{city.name}</div>
        <div>{preset.name}</div>

        {latestStatus && <Indicators latestStatus={latestStatus} />}

        <PresetInfoTable
          preset={preset}
          latestStatus={latestStatus}
          totalChanges={totalChanges}
          region={region}
          city={city}
        />

        {geojson ? (
          <FeatureList geojson={geojson} />
        ) : (
          <div>
            <h1>{preset.name}</h1>
            <p>There is no data for this preset yet.</p>
          </div>
        )}
      </Panel>
      <Map geojson={geojson} />
    </div>
  );
};

export default CityPresetPage;

export const revalidate = GLOBAL_REVALIDATION_TIME;
