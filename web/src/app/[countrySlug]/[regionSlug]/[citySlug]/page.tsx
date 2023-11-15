import React from "react";
import { notFound } from "next/navigation";
import { fetchCity } from "./fetch";
import Breadcrumb from "@/components/breadcrumbs";

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
      <nav aria-label="breadcrumb">
        <Breadcrumb label="Home" url="/" />
        <Breadcrumb label={city.country.name} url={city.country.url} />
        <Breadcrumb label={city.region.name} url={city.region.url} />
        <Breadcrumb label={city.name} isLast={true} />
      </nav>
      <h1>{city.name}</h1>
    </div>
  );
};

export default CityPage;
