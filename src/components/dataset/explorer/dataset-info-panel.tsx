"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableHeader,
  Row,
  Cell,
  Column,
} from "react-aria-components";

type DatasetInfoPanelProps = {
  dataset: Dataset;
};

type InfoRowData = {
  label: string;
  value: string;
  isPill?: boolean;
};

export function DatasetInfoPanel({ dataset }: DatasetInfoPanelProps) {
  const t = useTranslations("DatasetExplorer");
  const pageT = useTranslations("DatasetPage");

  const basicInfoRows: InfoRowData[] = [
    { label: t("category"), value: dataset.template.category, isPill: true },
    {
      label: t("status"),
      value: dataset.isActive ? pageT("active") : pageT("inactive"),
      isPill: true,
    },
    {
      label: t("visibility"),
      value: dataset.isPublic ? pageT("public") : pageT("private"),
      isPill: true,
    },
  ];

  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToDatasets")}
      </Link>

      <h2 className="text-lg font-semibold leading-tight">
        {t("datasetTitle", {
          template: dataset.template.name,
          city: dataset.area.name,
        })}
      </h2>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("basicInfo")}</h3>
        <Table aria-label={t("basicInfo")} className="w-full">
          <TableHeader>
            <Column isRowHeader className="sr-only">
              {t("property")}
            </Column>
            <Column className="sr-only">{t("value")}</Column>
          </TableHeader>
          <TableBody>
            {basicInfoRows.map((row, index) => (
              <Row
                key={index}
                className="border-b border-gray-200 last:border-b-0"
              >
                <Cell className="py-2 text-sm text-gray-700">{row.label}</Cell>
                <Cell className="text-right py-2 text-sm">
                  {row.isPill ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {row.value}
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-900">
                      {row.value}
                    </span>
                  )}
                </Cell>
              </Row>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
