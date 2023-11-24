import React from "react";
import { notFound } from "next/navigation";
import { RegionWithCounts, fetchCountry } from "./fetch";
import Breadcrumbs from "../components/breadcrumbs";
import Table, { Column } from "../components/table";

type CountryPageProps = {
  params: {
    countrySlug: string;
  };
};

const CountryPage = async (props: CountryPageProps) => {
  const { countrySlug } = props.params;

  const country = await fetchCountry(countrySlug);

  if (!country) {
    return notFound();
  }

  const columns: Column<RegionWithCounts>[] = [
    {
      title: "Name",
      dataIndex: "name",
      render: (value: string, record: RegionWithCounts) => (
        <a
          href={`/${country.name_slug}/${record.name_slug}`}
          className="text-blue-600 hover:text-blue-800"
        >
          {value}
        </a>
      ),
      align: "left",
    },

    {
      title: "# of cities",
      dataIndex: "_count",
      render: (value: RegionWithCounts["_count"]) => value.cities || "-",
      align: "center",
    },
  ];

  return (
    <div role="main">
      <Breadcrumbs
        breadcrumbs={[
          { label: "Home", url: "/" },
          { label: country.name, isLast: true },
        ]}
      />
      {country.regions.length > 0 ? (
        <Table columns={columns} data={country.regions} />
      ) : (
        <div>No regions found</div>
      )}
    </div>
  );
};

export default CountryPage;
