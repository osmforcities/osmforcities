import type { Dataset } from "@/schemas/dataset";
import { DatasetSchema } from "@/schemas/dataset";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import type { FeatureCollection } from "geojson";
import type { User } from "next-auth";

type RawDataset = {
  [key: string]: unknown;
  geojson?: unknown;
  bbox?: unknown;
  template?: {
    translations?: Array<unknown>;
    name: string;
    description: string | null;
    [key: string]: unknown;
  };
  area?: {
    geojson?: unknown;
    [key: string]: unknown;
  };
  savedBy?: Array<unknown>;
  _count?: {
    savedBy?: number;
  };
  isFeatured?: boolean | null;
};

function calculatePermissions(rawDataset: RawDataset, user: User | null) {
  return {
    canFeature: user?.isAdmin ?? false,
    canDelete: false,
    isFeatured: rawDataset.isFeatured ?? false,
  };
}

export function transformDataset(
  rawDataset: RawDataset,
  user: User | null,
  locale: string,
  options?: { isSaved?: boolean; skipTemplateResolution?: boolean }
): Dataset {
  if (!rawDataset.template) {
    throw new Error("Dataset template is required");
  }

  const resolvedTemplate = options?.skipTemplateResolution
    ? (rawDataset.template as { name: string; description: string | null; category?: { slug: string } })
    : resolveTemplateForLocale(
        rawDataset.template as {
          translations: Array<{ locale: string; name: string; description: string | null }>;
          name: string;
          description: string | null;
          category?: { slug: string };
        },
        locale
      );
  const permissions = calculatePermissions(rawDataset, user);

  // If isSaved is explicitly provided, use it. Otherwise infer from savedBy array.
  const isSaved = options?.isSaved ?? (rawDataset.savedBy ? rawDataset.savedBy.length > 0 : false);

  return DatasetSchema.parse({
    ...rawDataset,
    geojson: rawDataset.geojson as FeatureCollection | null,
    bbox: rawDataset.bbox as number[] | null,
    template: {
      ...resolvedTemplate,
      category: (resolvedTemplate as { category?: { id: string; name: string; slug: string } | null }).category ?? null,
    },
    area: rawDataset.area ? {
      ...rawDataset.area,
      geojson: rawDataset.area.geojson as FeatureCollection | null,
    } : rawDataset.area,
    isSaved,
    savedCount: rawDataset._count?.savedBy ?? rawDataset.savedBy?.length ?? 0,
    ...permissions,
  });
}
