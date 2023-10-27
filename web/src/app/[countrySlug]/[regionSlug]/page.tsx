import React from "react";
import { notFound } from "next/navigation";
import { fetchRegion } from "./fetch";
import Breadcrumb from "../../components/breadcrumbs";

type RegionPageProps = {
  params: {
    countrySlug: string;
    regionSlug: string;
  };
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

  return (
    <div role="main">
      <nav aria-label="breadcrumb">
        <Breadcrumb label="Home" url="/" />
        <Breadcrumb label={region.country.name} url={region.country.url} />
        <Breadcrumb label={region.name} isLast />
      </nav>
      <h1>{region.name}</h1>
      <ul>
        {region.cities.map(({ name, url }) => (
          <li>
            <a href={url}>{name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RegionPage;
