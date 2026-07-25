import { prisma } from "@/lib/db";
import { getAreaDetailsById } from "@/lib/nominatim";
import { resolveTemplate } from "@/lib/template-resolver";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { fetchOsmRelationData } from "@/lib/area-boundary";
import { refreshAreaInfoIfStale, resolveAreaCenter } from "@/lib/area-refresh";
import { mergeAreaNames, toStoredNames } from "@/lib/area-name";
import {
  fetchDatasetSnapshot,
  DatasetTooLargeError,
  DatasetSizeCheckTimeoutError,
} from "@/lib/dataset-snapshot";
import { Prisma } from "@prisma/client";
import { trackEvent } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { createLogger } from "@/lib/logger";

const logger = createLogger("dataset-operations");

export type DatasetCreationResult = {
  dataset: NonNullable<Awaited<ReturnType<typeof getDatasetWithDetails>>>;
  wasCreated: boolean;
};

export async function getOrCreateDataset(
  areaId: number,
  templateIdentifier: string,
  locale: string,
  options?: { allowCreate?: boolean }
): Promise<DatasetCreationResult> {
  const template = await resolveTemplate(templateIdentifier);
  if (!template) {
    throw new Error(`Template not found: ${templateIdentifier}`);
  }

  if (!template.isActive) {
    throw new Error(`Template is not active: ${templateIdentifier}`);
  }

  if (template.deprecatesAt) {
    throw new Error(`Template is deprecated: ${templateIdentifier}`);
  }

  let dataset = await getDatasetWithDetails(areaId, template.id, locale);

  if (dataset) {
    void refreshAreaInfoIfStale(dataset.area);
    return { dataset, wasCreated: false };
  }

  // Anonymous visits (public featured pages) must never create datasets,
  // even if the row disappears between the page's featured check and this
  // fetch — the invariant is enforced here, where creation happens
  if (options?.allowCreate === false) {
    throw new Error(`Dataset not found: ${templateIdentifier}`);
  }

  dataset = await createDatasetOnDemand(areaId, template, locale);
  return { dataset, wasCreated: true };
}

async function getDatasetWithDetails(areaId: number, templateId: string, locale: string) {
  const dataset = await prisma.dataset.findFirst({
    where: {
      areaId,
      templateId,
      isActive: true,
    },
    select: {
      id: true,
      templateId: true,
      areaId: true,
      cityName: true,
      geojson: true,
      bbox: true,
      dataCount: true,
      lastChecked: true,
      stats: true,
      createdAt: true,
      updatedAt: true,
      isActive: true,
      isFeatured: true,
      template: {
        select: {
          id: true,
          name: true,
          description: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          tags: true,
          filterableTags: true,
          translations: {
            select: {
              locale: true,
              name: true,
              description: true,
            },
          },
        },
      },
      area: {
        select: {
          id: true,
          name: true,
          names: true,
          countryCode: true,
          bounds: true,
          centerLat: true,
          centerLon: true,
          refreshedAt: true,
          geojson: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      savedBy: {
        select: {
          id: true,
          userId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!dataset) {
    return null;
  }

  // Resolve template translations for the given locale
  const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);

  return {
    ...dataset,
    template: resolvedTemplate,
  };
}

async function createDatasetOnDemand(
  areaId: number,
  template: NonNullable<Awaited<ReturnType<typeof resolveTemplate>>>,
  locale: string
) {
  let area = await prisma.area.findUnique({
    where: { id: areaId },
  });

  if (area) {
    area = await refreshAreaInfoIfStale(area);
  }

  if (!area) {
    try {
      const [osmData, areaDetails] = await Promise.all([
        fetchOsmRelationData(areaId),
        getAreaDetailsById(areaId).catch(() => null),
      ]);

      if (!osmData && !areaDetails) {
        throw new Error(`Area not found: ${areaId}`);
      }

      // City OSM relations don't carry ISO3166 tags — Nominatim is the
      // only reliable source for country code.
      const center = resolveAreaCenter(osmData, areaDetails);
      const mergedNames = mergeAreaNames(areaDetails?.names, osmData?.names);
      const shared = {
        countryCode: areaDetails?.countryCode ?? null,
        centerLat: center?.centerLat ?? null,
        centerLon: center?.centerLon ?? null,
        refreshedAt: new Date(),
        names: toStoredNames(mergedNames),
      };

      const data = osmData
        ? {
            ...shared,
            name: osmData.name,
            bounds: osmData.bounds,
            geojson: JSON.parse(JSON.stringify(osmData.convertedGeojson)),
          }
        : {
            ...shared,
            name: areaDetails!.name,
            bounds: areaDetails!.boundingBox
              ? JSON.stringify(areaDetails!.boundingBox)
              : null,
            geojson: Prisma.JsonNull,
          };

      area = await prisma.area.upsert({
        where: { id: areaId },
        update: data,
        create: { id: areaId, ...data },
      });
    } catch (error) {
      logger.error("Failed to fetch area data", { areaId, error });
      throw new Error(`Failed to fetch area data: ${areaId}`);
    }
  }

  try {
    const snapshot = await fetchDatasetSnapshot(
      area.id,
      template.overpassQuery,
      template.id
    );
    const dataset = await prisma.dataset.create({
      data: {
        templateId: template.id,
        areaId: area.id,
        cityName: area.name,
        isActive: true,
        geojson: JSON.parse(JSON.stringify(snapshot.geojson)),
        bbox: snapshot.bbox ? JSON.parse(JSON.stringify(snapshot.bbox)) : null,
        dataCount: snapshot.dataCount,
        lastChecked: new Date(),
        stats: JSON.parse(JSON.stringify(snapshot.stats)),
        lastEditedAt: snapshot.stats.mostRecentElement ?? null,
        contributorsCount: snapshot.stats.editorsCount,
        recentlyEditedCount: snapshot.stats.recentActivity.elementsEdited,
      },
      select: {
        id: true,
        templateId: true,
        areaId: true,
        cityName: true,
        geojson: true,
        bbox: true,
        dataCount: true,
        lastChecked: true,
        stats: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        isFeatured: true,
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            tags: true,
            filterableTags: true,
            translations: {
              select: {
                locale: true,
                name: true,
                description: true,
              },
            },
          },
        },
        area: {
          select: {
            id: true,
            name: true,
            names: true,
            countryCode: true,
            bounds: true,
            centerLat: true,
            centerLon: true,
            refreshedAt: true,
            geojson: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        savedBy: {
          select: {
            id: true,
            userId: true,
            createdAt: true,
          },
        },
      },
    });

    await trackEvent(ANALYTICS_EVENTS.DATASET_CREATE, `/datasets/${dataset.id}/create`);

    // Resolve template translations for the given locale
    const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);

    return {
      ...dataset,
      template: resolvedTemplate,
    };
  } catch (error) {
    logger.error("Failed to fetch Overpass data", { areaId, templateId: template.id, error });

    // Typed size-check errors already carry sanitized user-facing messages
    if (
      error instanceof DatasetTooLargeError ||
      error instanceof DatasetSizeCheckTimeoutError
    ) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        throw new Error(
          "Request timed out - the area may be too large or the query too complex"
        );
      }
      if (
        error.message.includes("too large") ||
        error.message.includes("memory")
      ) {
        throw new Error(
          "Dataset too large - try a smaller area or more specific template"
        );
      }
    }

    throw new Error("Failed to load dataset data. Please try again later.");
  }
}

export async function datasetExists(
  areaId: number,
  templateIdentifier: string
): Promise<boolean> {
  const template = await resolveTemplate(templateIdentifier);
  if (!template) {
    return false;
  }

  const count = await prisma.dataset.count({
    where: {
      areaId,
      templateId: template.id,
      isActive: true,
    },
  });

  return count > 0;
}

export async function getDatasetMetadata(
  areaId: number,
  templateIdentifier: string,
  locale: string
) {
  const template = await resolveTemplate(templateIdentifier);
  if (!template) {
    return null;
  }

  const dataset = await prisma.dataset.findFirst({
    where: {
      areaId,
      templateId: template.id,
      isActive: true,
    },
    select: {
      id: true,
      cityName: true,
      dataCount: true,
      lastChecked: true,
      createdAt: true,
      updatedAt: true,
      template: {
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          tags: true,
          filterableTags: true,
          translations: true,
        },
      },
      area: {
        select: {
          id: true,
          name: true,
          countryCode: true,
        },
      },
      _count: {
        select: {
          savedBy: true,
        },
      },
    },
  });

  if (!dataset) {
    return null;
  }

  // Resolve template translations for the given locale
  const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);

  return {
    ...dataset,
    template: resolvedTemplate,
  };
}
