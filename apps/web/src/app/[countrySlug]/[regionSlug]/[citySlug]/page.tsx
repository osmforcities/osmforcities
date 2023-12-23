import React from "react";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/app/components/breadcrumbs";
import Table, { Column } from "@/app/components/table";
import { City, Preset } from "@prisma/client";
import { formatToPercent } from "../page";
import { InternalLink } from "@/app/components/common";
import { getCity } from "@/app/utils/get-city";
import { getCountry } from "@/app/utils/get-country";
import { getRegion } from "@/app/utils/get-region";
import { CityPresetStatsWithPreset, fetchCityPresetsStats } from "./fetch";
import { GLOBAL_REVALIDATION_TIME } from "@/constants";
import { Footer } from "@/app/components/footer";

type CityPageProps = {
  params: {
    countrySlug: string;
    regionSlug: string;
    citySlug: string;
  };
};

const HeaderSection = ({
  city,
  presetsStats,
}: {
  city: City;
  presetsStats: CityPresetStatsWithPreset[];
}) => {
  const totalFeatures = presetsStats.reduce(
    (acc, preset) => acc + preset.totalFeatures,
    0
  );

  const totalChangesets = presetsStats.reduce(
    (acc, preset) => acc + preset.totalChangesets,
    0
  );

  return (
    <section id="header">
      <h2 className="text-3xl font-bold text-center pt-5">City Info</h2>
      <table className="table-auto w-full my-4">
        <tbody>
          <tr className="border-b border-gray-300">
            <td className="font-bold py-2 px-2">Name</td>
            <td className="py-2 px-2 text-right">{city.name}</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="font-bold py-2 px-2">Total Features</td>
            <td className="py-2 px-2 text-right">{totalFeatures}</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="font-bold py-2 px-2">Total changesets</td>
            <td className="py-2 px-2 text-right">{totalChangesets}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
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
      title: "required tags coverage (%)",
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

      <HeaderSection city={city} presetsStats={presetsWithStats} />

      {presetsWithStats.length > 0 ? (
        <section id="feature-list">
          <h2 className="text-3xl font-bold text-center pb-10 pt-5">
            Presets List
          </h2>
          <Table columns={presetsStatsColumns} data={presetsWithStats} />
        </section>
      ) : (
        <div className="empty-stats-message">
          <p>Currently, there are no available statistics for {city.name}.</p>
          <p>This is probably an issue on our side, please check back later.</p>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default CityPage;

export const revalidate = GLOBAL_REVALIDATION_TIME;
