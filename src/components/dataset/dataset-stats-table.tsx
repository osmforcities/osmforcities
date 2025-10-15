"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableHeader,
  Row,
  Cell,
  Column,
} from "react-aria-components";

type DatasetStatsTableProps = {
  dataset: Dataset;
};

type TableRowData = {
  label: string;
  value: string;
};

export function DatasetStatsTable({ dataset }: DatasetStatsTableProps) {
  const t = useTranslations("DatasetPage");
  const pageT = useTranslations("DatasetPage");

  const dataRows: TableRowData[] = [
    {
      label: pageT("totalFeatures"),
      value: dataset.dataCount.toLocaleString(),
    },
    {
      label: pageT("totalEditors"),
      value: (dataset.stats?.editorsCount || 0).toLocaleString(),
    },
    {
      label: pageT("changesets"),
      value: (dataset.stats?.changesetsCount || 0).toLocaleString(),
    },
  ];

  const activityRows: TableRowData[] = [];

  if (dataset.stats?.recentActivity) {
    const elementsEdited = dataset.stats.recentActivity.elementsEdited;
    const editorsCount = dataset.stats?.editorsCount || 0;

    let activityLevel;
    if (elementsEdited > 50) {
      activityLevel = pageT("veryActive");
    } else if (elementsEdited > 10) {
      activityLevel = pageT("active");
    } else {
      activityLevel = pageT("lowActivity");
    }

    let communityStrength;
    if (editorsCount > 5) {
      communityStrength = pageT("strongCommunity");
    } else if (editorsCount > 1) {
      communityStrength = pageT("someContributors");
    } else {
      communityStrength = pageT("singleEditor");
    }

    activityRows.push(
      { label: pageT("activityLevel"), value: activityLevel },
      { label: pageT("communityStrength"), value: communityStrength }
    );
  }

  const renderTable = (rows: TableRowData[], ariaLabel: string) => (
    <Table aria-label={ariaLabel} className="w-full">
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

  return (
    <div className="space-y-6">
      {/* Data Overview */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("dataMetrics")}</h3>
        {renderTable(dataRows, t("dataMetrics"))}
      </div>

      {/* Activity Assessment */}
      {activityRows.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            {pageT("communityActivity")}
          </h3>
          {renderTable(activityRows, pageT("overallAssessment"))}
        </div>
      )}
    </div>
  );
}
