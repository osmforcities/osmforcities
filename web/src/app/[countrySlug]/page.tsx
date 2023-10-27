import React from "react";
import { notFound } from "next/navigation";
import { fetchCountry } from "./fetch";
import Breadcrumb from "../components/breadcrumbs";

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

  return (
    <div role="main">
      <nav aria-label="breadcrumb">
        <Breadcrumb label="Home" url="/" />
        <Breadcrumb label={country.name} isLast />
      </nav>
      <h1>{country.name}</h1>
    </div>
  );
};

export default CountryPage;
