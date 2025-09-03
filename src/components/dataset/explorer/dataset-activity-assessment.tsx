"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableHeader, Row, Cell, Column } from "react-aria-components";

type DatasetActivityAssessmentProps = {
  dataset: Dataset;
};

type AssessmentRowData = {
  label: string;
  value: string;
};

export function DatasetActivityAssessment({ dataset }: DatasetActivityAssessmentProps) {
  const t = useTranslations("DatasetPage");

  if (!dataset.stats?.recentActivity) {
    return null;
  }

  const elementsEdited = dataset.stats.recentActivity.elementsEdited;
  const editorsCount = dataset.stats?.editorsCount || 0;

  let activityLevel;
  if (elementsEdited > 50) {
    activityLevel = t("veryActive");
  } else if (elementsEdited > 10) {
    activityLevel = t("active");
  } else {
    activityLevel = t("lowActivity");
  }

  let communityStrength;
  if (editorsCount > 5) {
    communityStrength = t("strongCommunity");
  } else if (editorsCount > 1) {
    communityStrength = t("someContributors");
  } else {
    communityStrength = t("singleEditor");
  }

  const rows: AssessmentRowData[] = [
    { label: t("activityLevel"), value: activityLevel },
    { label: t("communityStrength"), value: communityStrength },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{t("overallAssessment")}</h3>
      <Table 
        aria-label={t("overallAssessment")}
        className="w-full"
      >
        <TableHeader>
          <Column isRowHeader className="sr-only">Assessment</Column>
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