"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations, useLocale } from "next-intl";
import {
  Table,
  TableBody,
  TableHeader,
  Row,
  Cell,
  Column,
} from "react-aria-components";
import { formatRelativeTime } from "@/lib/dataset-stats";

type DatasetStatsTableProps = {
  dataset: Dataset;
};

type TableRowData = {
  label: string;
  value: string;
};

export function DatasetStatsTable({ dataset }: DatasetStatsTableProps) {
  const t = useTranslations("DatasetPage");
  const locale = useLocale();

  const rows: TableRowData[] = [
    {
      label: t("totalFeatures"),
      value: dataset.dataCount.toLocaleString(),
    },
    {
      label: t("totalEditors"),
      value: (dataset.stats?.editorsCount || 0).toLocaleString(),
    },
    {
      label: t("lastEdited"),
      value: formatRelativeTime(dataset.stats?.mostRecentElement, locale),
    },
  ];

  return (
    <Table aria-label={t("dataMetrics")} className="w-full">
      <TableHeader>
        <Column isRowHeader className="sr-only">
          {t("property")}
        </Column>
        <Column className="sr-only">{t("value")}</Column>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <Row key={index} className="border-b border-gray-200 last:border-b-0">
            <Cell className="py-2 text-sm text-gray-700">{row.label}</Cell>
            <Cell className="text-right py-2 text-sm">
              <span className="font-semibold text-gray-900">{row.value}</span>
            </Cell>
          </Row>
        ))}
      </TableBody>
    </Table>
  );
}
