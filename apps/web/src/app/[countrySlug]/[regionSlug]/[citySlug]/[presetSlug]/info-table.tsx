import React from "react";
import { formatToPercent } from "../../page";
import { getCityPresetGeojsonGitUrl } from "@/app/utils/git-url";
import { ExternalLink } from "@/app/components/common";
import { City, CityPresetStats, Preset, Region } from "@prisma/client";

const Table = ({ children }: { children: React.ReactNode }) => {
  return <table className="table-auto w-full my-4">{children}</table>;
};

const TableRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => {
  return (
    <tr className="border-b border-gray-300">
      <td className="font-bold py-2 px-2">{label}</td>
      <td className="py-2 px-2 text-right">{value}</td>
    </tr>
  );
};

const PresetInfoTable = ({
  preset,
  latestStatus,
  totalChanges,
  region,
  city,
}: {
  preset: Preset;
  latestStatus: CityPresetStats | null;
  totalChanges: number;
  region: Region;
  city: City;
}) => {
  return (
    <Table>
      <tbody>
        <TableRow label="Category" value={preset.category} />
        {preset.required_tags.length > 0 && (
          <TableRow
            label="Required Tags Coverage"
            value={
              latestStatus?.requiredTagsCoverage
                ? formatToPercent(latestStatus.requiredTagsCoverage)
                : "-"
            }
          />
        )}
        <TableRow
          label="Recommended Tags"
          value={
            preset.recommended_tags.length > 0
              ? preset.recommended_tags.join(", ")
              : "-"
          }
        />
        {preset.recommended_tags.length > 0 && (
          <TableRow
            label="Recommended Tags Coverage"
            value={
              latestStatus?.recommendedTagsCoverage
                ? formatToPercent(latestStatus.recommendedTagsCoverage)
                : "-"
            }
          />
        )}
        <TableRow label="Osmium Filter" value={preset.osmium_filter} />
        <TableRow label="Feature Versions" value={totalChanges} />
        <TableRow
          label="GeoJSON file"
          value={
            <>
              <ExternalLink
                href={getCityPresetGeojsonGitUrl(region, city, preset, "blob")}
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
            </>
          }
        />
      </tbody>
    </Table>
  );
};

export default PresetInfoTable;
