import React from "react";
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
        <TableRow label="category" value={preset.category} />
        <TableRow label="feature count" value={latestStatus?.totalFeatures} />
      </tbody>
    </Table>
  );
};

export default PresetInfoTable;
