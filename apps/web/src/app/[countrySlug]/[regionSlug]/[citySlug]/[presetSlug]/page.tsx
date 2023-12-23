import Breadcrumbs from "@/app/components/breadcrumbs";
import { getCity } from "@/app/utils/get-city";
import { getCountry } from "@/app/utils/get-country";
import { getPreset } from "@/app/utils/get-preset";
import { getRegion } from "@/app/utils/get-region";
import { notFound } from "next/navigation";
import { fetchCityPresetGeojson, fetchLatestCityPresetStatus } from "./fetch";
import { ExternalLink } from "@/app/components/common";
import { formatDistanceToNow } from "date-fns";
import { getCityPresetGeojsonGitUrl } from "@/app/utils/git-url";
import { formatToPercent } from "../../page";
import { GLOBAL_REVALIDATION_TIME } from "@/constants";
import { Footer } from "@/app/components/footer";

type CityPagePageProps = {
  params: {
    countrySlug: string;
    regionSlug: string;
    citySlug: string;
    presetSlug: string;
  };
};

const CityPresetPage = async (props: CityPagePageProps) => {
  const { countrySlug, regionSlug, citySlug, presetSlug } = props.params;

  const [country, region, city, preset] = await Promise.all([
    getCountry({
      countrySlug,
    }),
    getRegion({
      countrySlug,
      regionSlug,
    }),
    getCity({
      countrySlug,
      regionSlug,
      citySlug,
    }),
    getPreset({
      presetSlug,
    }),
  ]);

  if (!country || !region || !city || !preset) {
    return notFound();
  }

  const latestStatus = await fetchLatestCityPresetStatus({
    city,
    preset,
  });

  const geojson = await fetchCityPresetGeojson({ region, city, preset });

  const totalChanges =
    geojson?.features?.reduce(
      (acc, f) => (f.properties?.version ? acc + f.properties.version : acc),
      0
    ) || 0;

  return (
    <div role="main">
      <Breadcrumbs
        breadcrumbs={[
          { label: "Home", url: "/" },
          { label: country.name, url: `/${country.name_slug}` },
          {
            label: region.name,
            url: `/${country.name_slug}/${region.name_slug}`,
          },
          {
            label: city.name,
            url: `/${country.name_slug}/${region.name_slug}/${city.name_slug}`,
          },
          { label: preset.name, isLast: true },
        ]}
      />
      <section id="header">
        <h2 className="text-3xl font-bold text-center pt-5">Preset Info</h2>
        <table className="table-auto w-full my-4">
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="font-bold py-2 px-2">Name</td>
              <td className="py-2 px-2 text-right">{preset.name}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="font-bold py-2 px-2">Category</td>
              <td className="py-2 px-2 text-right">{preset.category}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="font-bold py-2 px-2">Required Tags</td>
              <td className="py-2 px-2 text-right">
                {preset.required_tags.length > 0
                  ? preset.required_tags.join(", ")
                  : "-"}
              </td>
            </tr>
            {preset.required_tags.length > 0 && (
              <tr className="border-b border-gray-300">
                <td className="font-bold py-2 px-2">Required Tags Coverage</td>
                <td className="py-2 px-2 text-right">
                  {latestStatus?.requiredTagsCoverage
                    ? formatToPercent(latestStatus.requiredTagsCoverage)
                    : "-"}
                </td>
              </tr>
            )}
            <tr className="border-b border-gray-300">
              <td className="font-bold py-2 px-2">Recommended Tags</td>
              <td className="py-2 px-2 text-right">
                {preset.recommended_tags.length > 0
                  ? preset.recommended_tags.join(", ")
                  : "-"}
              </td>
            </tr>
            {preset.recommended_tags.length > 0 && (
              <tr className="border-b border-gray-300">
                <td className="font-bold py-2 px-2">
                  Recommended Tags Coverage
                </td>
                <td className="py-2 px-2 text-right">
                  {latestStatus?.recommendedTagsCoverage
                    ? formatToPercent(latestStatus.recommendedTagsCoverage)
                    : "-"}
                </td>
              </tr>
            )}
            <tr className="border-b border-gray-300">
              <td className="font-bold py-2 px-2">Osmium Filter</td>
              <td className="py-2 px-2 text-right">{preset.osmium_filter}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="font-bold py-2 px-2">Features</td>
              <td className="py-2 px-2 text-right">
                {latestStatus?.totalFeatures || "-"}
              </td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="font-bold py-2 px-2">Changesets</td>
              <td className="py-2 px-2 text-right">
                {latestStatus?.totalChangesets || "-"}
              </td>
            </tr>

            <tr className="border-b border-gray-300">
              <td className="font-bold py-2 px-2">Feature Versions</td>
              <td className="py-2 px-2 text-right">{totalChanges}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="font-bold py-2 px-2">GeoJSON file</td>
              <td className="py-2 px-2 text-right">
                <ExternalLink
                  href={getCityPresetGeojsonGitUrl(
                    region,
                    city,
                    preset,
                    "blob"
                  )}
                >
                  preview
                </ExternalLink>
                ,{" "}
                <ExternalLink
                  href={getCityPresetGeojsonGitUrl(
                    region,
                    city,
                    preset,
                    "history"
                  )}
                >
                  history
                </ExternalLink>
                ,{" "}
                <ExternalLink
                  href={getCityPresetGeojsonGitUrl(region, city, preset)}
                >
                  download
                </ExternalLink>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {geojson ? (
        <section id="feature-list">
          <h2 className="text-3xl font-bold text-center pb-10 pt-5">
            Feature List
          </h2>

          <table className="table-auto w-full">
            <thead>
              <tr>
                <th>osm id</th>
                <th>name</th>
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

                  const { version, name, timestamp } = properties;

                  return (
                    <tr key={id} className="border-b border-gray-300">
                      <td className="font-bold py-2 px-2">
                        <ExternalLink
                          href={`https://www.openstreetmap.org/${id}`}
                        >
                          {id}
                        </ExternalLink>
                      </td>

                      <td className="py-2 px-2">{name}</td>
                      <td className="py-2 px-2 text-center">{version}</td>

                      <td className="font-thin py-2 pl-2 pr-2 text-right">
                        {formatDistanceToNow(new Date(timestamp), {
                          addSuffix: true,
                        })}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </section>
      ) : (
        <div>
          <h1>{preset.name}</h1>
          <p>There is no data for this preset yet.</p>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default CityPresetPage;

export const revalidate = GLOBAL_REVALIDATION_TIME;
