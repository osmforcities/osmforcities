import React from "react";
import { notFound } from "next/navigation";
import { RegionWithCounts, fetchCountryRegions } from "./fetch";
import Breadcrumbs from "../components/breadcrumbs";
import Table, { Column } from "../components/table";
import { GLOBAL_REVALIDATION_TIME } from "@/constants";
import { Footer } from "../components/footer";
import FeaturedDatasetsSection from "../components/featured-datasets";

type CountryPageProps = {
  params: {
    countrySlug: string;
  };
};

const CountryPage = async (props: CountryPageProps) => {
  const { countrySlug } = props.params;

  const country = await fetchCountryRegions(countrySlug);

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
        <>
          <h2 className="text-left text-4xl mb-10 mt-10">All Regions</h2>
          <Table columns={columns} data={country.regions} />
        </>
      ) : (
        <div>No regions found</div>
      )}
      <FeaturedDatasetsSection countrySlug={countrySlug} />
      <Footer />
    </div>
  );
};

export default CountryPage;

export const revalidate = GLOBAL_REVALIDATION_TIME;
