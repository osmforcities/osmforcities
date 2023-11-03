import React from "react";
import { notFound } from "next/navigation";
import { fetchCity } from "./fetch";
import Breadcrumbs from "@/app/components/breadcrumbs";

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
      <h1>{city.name}</h1>
    </div>
  );
};

export default CityPage;
