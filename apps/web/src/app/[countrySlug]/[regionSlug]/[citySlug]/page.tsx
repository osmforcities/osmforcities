import React from "react";
import { notFound } from "next/navigation";
import { fetchCity } from "./fetch";
import Breadcrumbs from "@/app/components/breadcrumbs";
import Table, { Column } from "@/app/components/table";
import { CityStats } from "@prisma/client";
import { formatToPercent } from "../page";

type CityPageProps = {
  params: {
    countrySlug: string;
    regionSlug: string;
    citySlug: string;
  };
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

  const columns: Column<CityStats>[] = [
    {
      title: "Date",
      dataIndex: "date",
      render: (value) => (
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
      render: (value) => <>{value}</>,
      align: "center",
    },
    {
      title: "required tags (%)",
      dataIndex: "requiredTagsCoverage",
      render: (requiredTagsCoverage) =>
        requiredTagsCoverage ? formatToPercent(requiredTagsCoverage) : "-",
      align: "center",
    },
    {
      title: "recommended tags (%)",
      dataIndex: "recommendedTagsCoverage",
      render: (recommendedTagsCoverage) =>
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

      <h2 className="text-xl font-bold mb-6">Recent history</h2>
      {city.stats.length > 0 ? (
        <Table columns={columns} data={city.stats} />
      ) : (
        <div className="empty-stats-message">
          <p>Currently, there are no available statistics for {city.name}.</p>
          <p>This is probably an error on our side, please check back later!</p>
        </div>
      )}
    </div>
  );
};

export default CityPage;
