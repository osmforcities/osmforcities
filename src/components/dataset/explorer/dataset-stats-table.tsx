"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableHeader, Row, Cell, Column } from "react-aria-components";

type DatasetStatsTableProps = {
  dataset: Dataset;
};

type TableRowData = {
  label: string;
  value: string;
};

export function DatasetStatsTable({ dataset }: DatasetStatsTableProps) {
  const t = useTranslations("DatasetExplorer");
  const pageT = useTranslations("DatasetPage");

  const rows: TableRowData[] = [
    { label: t("city"), value: dataset.cityName },
    { label: t("template"), value: dataset.template.name },
    { label: t("category"), value: dataset.template.category },
    { 
      label: t("status"), 
      value: dataset.isActive ? pageT("active") : pageT("inactive")
    },
    { 
      label: pageT("totalFeatures"), 
      value: dataset.dataCount.toLocaleString() 
    },
    { 
      label: pageT("totalEditors"), 
      value: (dataset.stats?.editorsCount || 0).toLocaleString() 
    },
    { 
      label: pageT("changesets"), 
      value: (dataset.stats?.changesetsCount || 0).toLocaleString() 
    },
  ];

  if (dataset.stats?.averageElementAge) {
    rows.push({
      label: pageT("avgAgeDays"),
      value: Math.round(dataset.stats.averageElementAge).toString(),
    });
  }

  return (
    <div className="space-y-2">
      <Table 
        aria-label={t("datasetDetails")}
        className="w-full"
      >
        <TableHeader>
          <Column isRowHeader className="sr-only">Property</Column>
          <Column className="sr-only">Value</Column>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <Row 
              key={index}
              className="border-b border-gray-100 last:border-b-0"
            >
              <Cell className="font-thin py-2 text-sm text-muted-foreground">
                {row.label}
              </Cell>
              <Cell className="font-semibold text-right py-2 text-sm">
                {row.value}
              </Cell>
            </Row>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
