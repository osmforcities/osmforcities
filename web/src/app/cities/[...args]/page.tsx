import React from "react";
import { PrismaClient } from "@prisma/client";
import { getCityBySlug } from "./get-city-by-slug";
import { City } from "@/app/types/global";

const prisma = new PrismaClient();

type CityPageProps = {
  params: {
    args: string[];
  };
};

const CityPage = async (props: CityPageProps) => {
  const city = (await getCityBySlug(props.params.args)) as City;

  if (!city) {
    return <div>City not found</div>;
  }

  console.log(city);

  return <div role="main">{city.name}</div>;
};

export default CityPage;
