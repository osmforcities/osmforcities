import type { Locale } from "next-intl";

interface DatasetLocation {
  locale: Locale | string;
  areaId: number;
  templateId: string;
}

/** Path to a dataset page. Datasets are keyed by (areaId, templateId), not by id. */
export function getDatasetPath({ locale, areaId, templateId }: DatasetLocation): string {
  return `/${locale}/area/${areaId}/dataset/${templateId}`;
}

/** Absolute dataset URL for contexts without a router (emails, external links). */
export function getDatasetUrl(baseUrl: string, location: DatasetLocation): string {
  return `${baseUrl}${getDatasetPath(location)}`;
}
