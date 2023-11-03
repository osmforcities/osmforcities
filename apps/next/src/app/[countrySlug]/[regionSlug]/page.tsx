import React from "react";
import { notFound } from "next/navigation";
import { fetchRegion } from "./fetch";
import Breadcrumbs from "../../components/breadcrumbs";

type RegionPageProps = {
  params: {
    countrySlug: string;
    regionSlug: string;
  };
};

const formatToPercent = (value: number) => {
  const percentage = value * 100;
  // Check if the percentage is an integer
  if (percentage % 1 === 0) {
    // If it is an integer, return without decimals
    return `${percentage}%`;
  } else {
    // If it is not an integer, return with two decimal places
    return `${percentage.toFixed(1)}%`;
  }
};

const RegionPage = async (props: RegionPageProps) => {
  const { regionSlug, countrySlug } = props.params;

  const region = await fetchRegion({
    countrySlug,
    regionSlug,
  });

  if (!region) {
    return notFound();
  }

  const cities = region.cities.sort((a, b) => {
    if (!a.stats || !b.stats) return 0;

    return a.stats.presetsCount > b.stats.presetsCount ? -1 : 1;
  });

  return (
    <>
      <Breadcrumbs
        breadcrumbs={[
          { label: "Home", url: "/" },
          { label: region.country.name, url: region.country.url },
          { label: region.name, isLast: true },
        ]}
      />
      <h1 className="text-center text-2xl font-bold mb-6">
        Cities of {region.name}, {region.country.name}
      </h1>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">
                Name
              </th>
              <th className="border border-gray-300 px-4 py-2 text-center">
                # of presets
              </th>
              <th className="border border-gray-300 px-4 py-2 text-center">
                coverage (%)
              </th>
            </tr>
          </thead>
          <tbody>
            {cities.map(({ name, url, stats }) => (
              <tr key={name} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">
                  <a href={url} className="text-blue-600 hover:text-blue-800">
                    {name}
                  </a>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {stats ? stats.presetsCount : "-"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {stats ? formatToPercent(stats.requiredTagsCoverage) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default RegionPage;
