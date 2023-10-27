import React from "react";
import { notFound } from "next/navigation";
import { fetchCountry } from "./fetch";
import Breadcrumb from "../components/breadcrumbs";

type CountryPageProps = {
  params: {
    countrySlug: string;
  };
};

const RegionList = ({
  regions,
}: {
  regions: { name: string; url: string }[];
}) => {
  return (
    <ul>
      {regions.map(({ name, url }) => (
        <li>
          <a href={url}>{name}</a>
        </li>
      ))}
    </ul>
  );
};

const CountryPage = async (props: CountryPageProps) => {
  const { countrySlug } = props.params;

  const country = await fetchCountry(countrySlug);

  if (!country) {
    return notFound();
  }

  return (
    <div role="main">
      <nav aria-label="breadcrumb">
        <Breadcrumb label="Home" url="/" />
        <Breadcrumb label={country.name} isLast />
      </nav>
      <h1>{country.name}</h1>
      {country.regions.length > 0 ? (
        <RegionList regions={country.regions} />
      ) : (
        <div>No regions found</div>
      )}
    </div>
  );
};

export default CountryPage;
