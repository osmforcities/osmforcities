import React from "react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "@/app/components/common";
import type { Feature, FeatureCollection } from "geojson";

type FeatureListProps = {
  geojson: FeatureCollection;
};

const FeatureTableRow = ({ id, properties }: Feature) => {
  // const { version, name, timestamp } = properties;

  return (
    <tr key={id}>
      <td>{properties.name || properties.id}</td>
      {/* <td className="font-bold py-2 px-2">
        <ExternalLink href={`https://www.openstreetmap.org/${id}`}>
          {id}
        </ExternalLink>
      </td>
      <td className="py-2 px-2">{name}</td>
      <td className="py-2 px-2 text-center">{version}</td>
      <td className="font-thin py-2 pl-2 pr-2 text-right">
        {formatDistanceToNow(new Date(timestamp), {
          addSuffix: true,
        })}
      </td> */}
    </tr>
  );
};

const FeatureList = ({ geojson }: FeatureListProps) => {
  return (
    <section id="feature-list">
      <h2 className="text-3xl font-bold text-center pb-10 pt-5">
        Feature List
      </h2>
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th>Name/id</th>
            <th>version</th>
            <th className="text-right pr-2">timestamp</th>
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
