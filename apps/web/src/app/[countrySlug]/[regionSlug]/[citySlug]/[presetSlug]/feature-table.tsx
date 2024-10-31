import React from "react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "@/app/components/common";
import type { Feature, FeatureCollection } from "geojson";
import Heading from "@/app/components/headings";

type FeatureListProps = {
  geojson: FeatureCollection;
};

const FeatureTableRow = ({ id, properties }: Feature) => {
  if (!properties) {
    return null;
  }

  const { name, timestamp, version } = properties;

  return (
    <tr key={id}>
      <td className="text-xs py-1">
        <ul>
          <li className="font-semibold">{name}</li>
          <li>
            <ExternalLink href={`https://www.openstreetmap.org/${id}`}>
              {id}
            </ExternalLink>
          </li>
        </ul>
      </td>
      <td className="text-center text-xs">{version}</td>
      <td className="text-center text-xs">
        {formatDistanceToNow(new Date(timestamp), {
          addSuffix: true,
        })}
      </td>
    </tr>
  );
};

const FeatureList = ({ geojson }: FeatureListProps) => {
  return (
    <section id="feature-list">
      <Heading level={3} size="small">
        Feature List
      </Heading>
      <table className="table-auto w-full">
        <thead className="w-full">
          <tr className="text-xs uppercase">
            <th className="text-left font-thin">Name/OSM ID</th>
            <th className="font-thin">version</th>
            <th className="text-right pr-2 font-thin">timestamp</th>
          </tr>
        </thead>
        <tbody>
          {geojson.features
            .sort((a, b) =>
              b.properties?.timestamp.localeCompare(a.properties?.timestamp)
            )
            .map(({ id, properties }) => {
              if (!properties) {
                return null;
              }

              return (
                <FeatureTableRow key={id} id={id} properties={properties} />
              );
            })}
        </tbody>
      </table>
    </section>
  );
};

export default FeatureList;
