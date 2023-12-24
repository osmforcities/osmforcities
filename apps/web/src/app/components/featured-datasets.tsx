import { fetchFeaturedDatasetsByCategory } from "../fetch";
import { InternalLink } from "./common";
import { FEATURE_COUNT_ON_FEATURED_DATASETS } from "@/constants";
import React from "react";
import { formatToPercent } from "../[countrySlug]/[regionSlug]/page";

interface FeaturedDatasetsSectionProps {
  countrySlug?: string;
  regionSlug?: string;
}

const FeaturedDatasetsSection: React.FC<FeaturedDatasetsSectionProps> = async (
  props
) => {
  const latestChanges = await fetchFeaturedDatasetsByCategory(props);

  if (!latestChanges) {
    return null;
  }

  return (
    <section id="latest-changes">
      <div className="flex flex-col mx-auto mt-10">
        <h2 className="text-left text-4xl mb-10">Featured Datasets</h2>
        <div>
          Datasets with more than {FEATURE_COUNT_ON_FEATURED_DATASETS} features,
          in descending order of required tag coverage.
        </div>
        {latestChanges.map(({ category, datasets }) => {
          if (datasets.length === 0) {
            return null;
          }
          return (
            <>
              <h3
                key={category}
                className="text-2xl font-bold mt-10 mb-5 capitalize"
              >
                {category}
              </h3>

              <table className="table-auto">
                <thead className="sr-only">
                  <tr>
                    <th>Dataset</th>
                    <th>Features Count</th>
                    <th>Tag coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map(
                    ({
                      presetName,
                      presetUrl,
                      cityName,
                      featureCount,
                      requiredTagsCoverage,
                    }) => {
                      return (
                        <tr
                          key={presetUrl}
                          className="border-b border-gray-300"
                        >
                          <td className="font-bold py-2 px-2">
                            <InternalLink href={presetUrl}>
                              {presetName} in {cityName}
                            </InternalLink>
                          </td>
                          <td className="font-thin py-2 pl-2 pr-5 text-right">
                            {featureCount} features,{" "}
                            {formatToPercent(requiredTagsCoverage)} coverage
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedDatasetsSection;
