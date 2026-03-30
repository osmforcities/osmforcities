"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Feature } from "geojson";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHeader,
  Row,
  Cell,
  Column,
} from "react-aria-components";

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

const KEY_CELL_CLASSES =
  "py-1.5 pr-3 text-sm font-medium text-gray-500 align-top whitespace-nowrap";
const VALUE_CELL_CLASSES = "py-1.5 text-sm text-gray-800 break-all";

type FeatureDetailPanelProps = {
  feature: Feature;
  onBack: () => void;
};

const INTERNAL_KEYS = new Set(["ageCategory", "uid"]);
const METADATA_KEYS = new Set(["user", "timestamp", "version", "changeset"]);

export function FeatureDetailPanel({
  feature,
  onBack,
}: FeatureDetailPanelProps) {
  const t = useTranslations("DatasetMap");
  const properties = feature.properties || {};

  // osmtogeojson outputs a combined "id" field like "node/12345" or "way/67890"
  const osmFeatureId = properties["id"];
  const [osmType, osmId] =
    typeof osmFeatureId === "string" && osmFeatureId.includes("/")
      ? osmFeatureId.split("/")
      : [undefined, undefined];

  let name: string | undefined;
  let osmUser: string | undefined;
  let osmTimestamp: string | undefined;
  const displayTags: [string, string][] = [];

  Object.entries(properties).forEach(([key, value]) => {
    if (key === "id" || key.startsWith("@") || INTERNAL_KEYS.has(key)) return;
    if (key === "name") { name = String(value); return; }
    if (METADATA_KEYS.has(key)) {
      if (key === "user") osmUser = String(value);
      if (key === "timestamp") osmTimestamp = String(value);
      return;
    }
    displayTags.push([key, String(value)]);
  });

  const osmUrl =
    osmType && osmId
      ? `https://www.openstreetmap.org/${osmType}/${osmId}`
      : null;

  const osmUserUrl = osmUser
    ? `https://www.openstreetmap.org/user/${encodeURIComponent(osmUser)}`
    : null;

  const formattedDate = osmTimestamp
    ? DATE_FORMATTER.format(new Date(osmTimestamp))
    : null;

  return (
    <div className="flex flex-col h-full" data-testid="feature-detail-panel">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 -ml-1 self-start"
      >
        <ArrowLeft className="size-4" />
        {t("back")}
      </button>

      <div className="flex-1 overflow-y-auto space-y-4">
        <div>
          {name ? (
            <h2 className="text-base font-semibold text-gray-900">{name}</h2>
          ) : (
            <h2 className="text-base font-semibold text-gray-900">
              {osmType && osmId
                ? `${osmType.charAt(0).toUpperCase() + osmType.slice(1)} ${osmId}`
                : t("noAdditionalInfo")}
            </h2>
          )}
        </div>

        {displayTags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">{t("tags")}</h3>
            <Table aria-label={t("tags")} className="w-full">
              <TableHeader>
                <Column isRowHeader className="w-1/2 text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("key")}
                </Column>
                <Column className="w-1/2 text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("value")}
                </Column>
              </TableHeader>
              <TableBody>
                {displayTags.map(([key, value]) => (
                  <Row
                    key={key}
                    className="border-b border-gray-200 last:border-b-0"
                  >
                    <Cell className={KEY_CELL_CLASSES}>{key}</Cell>
                    <Cell className={VALUE_CELL_CLASSES}>{value}</Cell>
                  </Row>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {(osmUser || formattedDate) && (
          <p className="text-xs text-gray-400">
            {osmUser && osmUserUrl
              ? t.rich("lastEditedBy", {
                  user: osmUser,
                  link: (chunks) => (
                    <a
                      href={osmUserUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {chunks}
                    </a>
                  ),
                })
              : null}
            {formattedDate ? ` · ${formattedDate}` : null}
          </p>
        )}
      </div>

      {osmUrl && (
        <Button
          asChild
          variant="outline"
          className="w-full h-10"
        >
          <a
            href={osmUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("openInOsm")}
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      )}
    </div>
  );
}
