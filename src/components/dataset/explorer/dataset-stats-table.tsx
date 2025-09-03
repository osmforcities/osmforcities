import type { Dataset } from "@/schemas/dataset";

type DatasetStatsTableProps = {
  dataset: Dataset;
};

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

export function DatasetStatsTable({ dataset }: DatasetStatsTableProps) {
  return (
    <Table>
      <tbody>
        <TableRow label="City" value={dataset.cityName} />
        <TableRow label="Template" value={dataset.template.name} />
        <TableRow label="Category" value={dataset.template.category} />
        <TableRow
          label="Status"
          value={dataset.isActive ? "Active" : "Inactive"}
        />
        <TableRow label="Watchers" value={dataset.watchersCount} />
        <TableRow
          label="Created"
          value={dataset.createdAt.toLocaleDateString()}
        />
        {dataset.user && (
          <TableRow
            label="Created by"
            value={dataset.user.name || dataset.user.email}
          />
        )}
      </tbody>
    </Table>
  );
}
