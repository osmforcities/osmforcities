import React from "react";
import { notFound } from "next/navigation";
import { fetchCity } from "./fetch";
import Breadcrumbs from "@/app/components/breadcrumbs";
import Table, { Column } from "@/app/components/table";
import { CityPresetStats, CityStats, Preset } from "@prisma/client";
import { formatToPercent } from "../page";
import { InternalLink } from "@/app/components/common";

type CityPageProps = {
  params: {
    countrySlug: string;
    regionSlug: string;
    citySlug: string;
  };
};

type PresetWithStats = Preset & {
  CityPresetStats: CityPresetStats;
};

const CityPage = async (props: CityPageProps) => {
  const { countrySlug, regionSlug, citySlug } = props.params;

  const city = await fetchCity({
    countrySlug,
    regionSlug,
    citySlug,
  });

  if (!city) {
    return notFound();
  }

  const recentHistoryColumns: Column<CityStats>[] = [
    {
      title: "Date",
      dataIndex: "date",
      render: (value: Date) => (
        <>
          {value.toLocaleDateString(undefined, {
            month: "short", // abbreviated month name
            day: "numeric", // numeric day of the month
            year: "numeric", // numeric year
          })}
        </>
      ),
      align: "center",
    },
    {
      title: "# of presets",
      dataIndex: "presetsCount",
      render: (value: number) => <>{value}</>,
      align: "center",
    },
    {
      title: "required tags (%)",
      dataIndex: "requiredTagsCoverage",
      render: ({ requiredTagsCoverage }: { requiredTagsCoverage: number }) =>
        requiredTagsCoverage ? formatToPercent(requiredTagsCoverage) : "-",
      align: "center",
    },
    {
      title: "recommended tags (%)",
      dataIndex: "recommendedTagsCoverage",
      render: (recommendedTagsCoverage: number) =>
        recommendedTagsCoverage
          ? formatToPercent(recommendedTagsCoverage)
          : "-",
      align: "center",
    },
  ];

  const presetsStatsColumns: Column<PresetWithStats>[] = [
    {
      title: "Name",
      dataIndex: "name",
      render: (value: string, record: PresetWithStats) => (
        <InternalLink href={`${citySlug}/${record.name_slug}`}>
          {value}
        </InternalLink>
      ),
    },
    {
      title: "# of features",
      dataIndex: "CityPresetStats",
      render: ({ totalFeatures }: CityPresetStats) => <>{totalFeatures}</>,
      align: "center",
    },
    {
      title: "# of changesets",
      dataIndex: "CityPresetStats",
      render: ({ totalChangesets }: CityPresetStats) => <>{totalChangesets}</>,
      align: "center",
    },
    {
      title: "last update",
      dataIndex: "CityPresetStats",
      render: ({ updatedAt }: CityPresetStats) => (
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
      title: "required tags (%)",
      dataIndex: "CityPresetStats",
      render: ({ requiredTagsCoverage }: { requiredTagsCoverage: number }) =>
        requiredTagsCoverage ? formatToPercent(requiredTagsCoverage) : "-",
      align: "center",
    },
    {
      title: "optional tags (%)",
      dataIndex: "CityPresetStats",
      render: ({
        recommendedTagsCoverage,
      }: {
        recommendedTagsCoverage: number;
      }) =>
        recommendedTagsCoverage
          ? formatToPercent(recommendedTagsCoverage)
          : "-",
      align: "center",
    },
  ];

  return (
    <div role="main">
      <Breadcrumbs
        breadcrumbs={[
          { label: "Home", url: "/" },
          { label: city.country.name, url: city.country.url },
          { label: city.region.name, url: city.region.url },
          { label: city.name, isLast: true },
        ]}
      />

      {city.stats.length === 0 || city.presets.length === 0 ? (
        <div className="empty-stats-message">
          <p>Currently, there are no available statistics for {city.name}.</p>
          <p>This is probably an issue on our side, please check back later.</p>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-bold mb-6">Available presets</h2>
          <Table columns={presetsStatsColumns} data={city.presets} />
          <h2 className="text-xl font-bold mb-6">Recent history</h2>
          <Table columns={recentHistoryColumns} data={city.stats} />
        </>
      )}
    </div>
  );
};

export default CityPage;
