import React from "react";
import { fetchCityFromPath } from "./fetch";

const Breadcrumb = ({
  label,
  url,
  isLast = false,
}: {
  label: string;
  url?: string;
  isLast?: boolean;
}) => (
  <>
    {isLast ? label : <a href={url}>{label}</a>}
    {!isLast && " > "}
  </>
);

type CityPageProps = {
  params: {
    args: string[];
  };
};

const CityPage = async (props: CityPageProps) => {
  const [countryCode, regionCode, cityCode] = props.params.args;

  if (!countryCode || !regionCode || !cityCode) {
    return <div>Invalid city path</div>;
  }

  const city = await fetchCityFromPath([countryCode, regionCode, cityCode]);

  if (!city) {
    return <div>City not found</div>;
  }

  return (
    <div role="main">
      <nav aria-label="breadcrumb">
        <Breadcrumb label="Home" url="/" />
        <Breadcrumb label={city.country.name} url={city.country.urlPath} />
        <Breadcrumb label={city.region.name} url={city.region.urlPath} />
        <Breadcrumb label={city.name} isLast={true} />
      </nav>
      <h1>{city.name}</h1>
    </div>
  );
};

export default CityPage;
