import React from "react";
import { ExternalLink } from "@/app/components/common";
import type { FeatureCollection } from "geojson";
import { getAge } from "@/app/utils/date";

type FeatureListProps = {
  geojson: FeatureCollection;
};

interface FeatureTableRowProps {
  id: string;
  properties: {
    name: string;
    timestamp: string;
    version: string;
  };
}

const FeatureTableRow = ({ id, properties }: FeatureTableRowProps) => {
  if (!properties) {
    return null;
  }

  const { name, timestamp, version } = properties;

  return (
    <tr key={id}>
      <td className="text-xs py-1">
        <ul>
          {name ? (
            <li className="font-semibold">{name}</li>
          ) : (
            <li className="font-thin">Unnamed</li>
          )}
          <li>
            <ExternalLink href={`https://www.openstreetmap.org/${id}`}>
              {id}
            </ExternalLink>
          </li>
        </ul>
      </td>
      <td className="text-center text-xs w-12">{version}</td>
      <td className="text-center text-xs w-12">{getAge(timestamp)}</td>
    </tr>
  );
};

const FeatureList = ({ geojson }: FeatureListProps) => {
  return (
    <section id="feature-list">
      <table className="table-auto w-full">
        <thead className="w-full">
          <tr className="text-xs uppercase">
            <th className="text-left font-thin">Name/OSM ID</th>
            <th className="font-thin">version</th>
            <th className="text-right pr-2 font-thin">age</th>
          </tr>
        </thead>
        <tbody>
          {geojson.features
            .sort((a, b) =>
              b.properties?.timestamp.localeCompare(a.properties?.timestamp)
            )
            .map(({ id, properties }) => {
              if (typeof id !== "string") {
                return null;
              }

              return (
                <FeatureTableRow
                  key={id}
                  id={id}
                  properties={
                    properties as {
                      name: string;
                      timestamp: string;
                      version: string;
                    }
                  }
                />
              );
            })}
        </tbody>
      </table>
    </section>
  );
};

export default FeatureList;
