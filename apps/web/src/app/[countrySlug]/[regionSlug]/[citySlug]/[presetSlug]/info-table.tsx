import React from "react";
import { formatToPercent } from "../../page";
import { City, CityPresetStats, Preset, Region } from "@prisma/client";

const Table = ({ children }: { children: React.ReactNode }) => {
  return <table className="table-auto w-full">{children}</table>;
};

const TableRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => {
  return (
    <tr className="">
      <td className="font-thin py-1">{label}</td>
      <td className="font-semibold text-right">{value}</td>
    </tr>
  );
};

const PresetInfoTable = ({
  preset,
  latestStatus,
  totalChanges,
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
            label="Tags Coverage"
            value={
              latestStatus?.requiredTagsCoverage
                ? formatToPercent(latestStatus.requiredTagsCoverage)
                : "-"
            }
          />
        )}
        <TableRow label="Feature Versions" value={totalChanges} />
      </tbody>
    </Table>
  );
};

export default PresetInfoTable;
