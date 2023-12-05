import React from "react";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/app/components/breadcrumbs";
import Table, { Column } from "@/app/components/table";
import { CityPresetStats, CityStats, Preset } from "@prisma/client";
import { formatToPercent } from "../page";
import { InternalLink } from "@/app/components/common";
import { getCity } from "@/app/utils/get-city";
import { getCountry } from "@/app/utils/get-country";
import { getRegion } from "@/app/utils/get-region";
import { CityPresetStatsWithPreset, fetchCityPresetsStats } from "./fetch";

type CityPageProps = {
  params: {
    countrySlug: string;
    regionSlug: string;
    citySlug: string;
  };
};

const CityPage = async (props: CityPageProps) => {
  const { countrySlug, regionSlug, citySlug } = props.params;

  const [country, region, city] = await Promise.all([
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
  ]);

  if (!country || !region || !city) {
    return notFound();
  }

  const presetsWithStats = await fetchCityPresetsStats({
    city,
  });

  const presetsStatsColumns: Column<CityPresetStatsWithPreset>[] = [
    {
      title: "Name",
      dataIndex: "preset",
      render: (value: Preset) => (
        <InternalLink href={`${citySlug}/${value.name_slug}`}>
          {value.name}
        </InternalLink>
      ),
    },
    {
      title: "last edited",
      dataIndex: "updatedAt",
      render: (updatedAt: Date) => (
        <>
          {updatedAt.toLocaleDateString(undefined, {
            month: "short", // abbreviated month name
            day: "numeric", // numeric day of the month
            year: "numeric", // numeric year
          })}
        </>
      ),
      align: "center",
    },
    {
      title: "# of features",
      dataIndex: "totalFeatures",
      render: (totalFeatures: number) => <>{totalFeatures}</>,
      align: "center",
    },
    {
      title: "# of changesets",
      dataIndex: "totalChangesets",
      render: (totalChangesets: number) => <>{totalChangesets}</>,
      align: "center",
    },

    {
      title: "required tags (%)",
      dataIndex: "requiredTagsCoverage",
      render: (requiredTagsCoverage: number) =>
        requiredTagsCoverage ? formatToPercent(requiredTagsCoverage) : "-",
      align: "center",
    },
  ];

  return (
    <div role="main">
      <Breadcrumbs
        breadcrumbs={[
          { label: "Home", url: "/" },
          { label: country.name, url: `/${country.name_slug}` },
          {
            label: region.name,
            url: `/${country.name_slug}/${region.name_slug}`,
          },
          { label: city.name, isLast: true },
        ]}
      />

      {presetsWithStats.length > 0 ? (
        <>
          <h2 className="text-xl font-bold mb-6">Available presets</h2>
          <Table columns={presetsStatsColumns} data={presetsWithStats} />
        </>
      ) : (
        <div className="empty-stats-message">
          <p>Currently, there are no available statistics for {city.name}.</p>
          <p>This is probably an issue on our side, please check back later.</p>
        </div>
      )}
    </div>
  );
};

export default CityPage;
