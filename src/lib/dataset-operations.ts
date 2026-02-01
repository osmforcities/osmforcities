import { prisma } from "@/lib/db";
import { getAreaDetailsById } from "@/lib/nominatim";
import { resolveTemplate } from "@/lib/template-resolver";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import {
  fetchOsmRelationData,
  executeOverpassQuery,
  convertOverpassToGeoJSON,
  extractDatasetStats,
} from "@/lib/osm";
import { calculateBbox } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export type DatasetCreationResult = {
  dataset: NonNullable<Awaited<ReturnType<typeof getDatasetWithDetails>>>;
  wasCreated: boolean;
};

export async function getOrCreateDataset(
  areaId: number,
  templateIdentifier: string,
  locale: string
): Promise<DatasetCreationResult> {
  const template = await resolveTemplate(templateIdentifier);
  if (!template) {
    throw new Error(`Template not found: ${templateIdentifier}`);
  }

  if (!template.isActive) {
    throw new Error(`Template is not active: ${templateIdentifier}`);
  }

  let dataset = await getDatasetWithDetails(areaId, template.id, locale);

  if (dataset) {
    return { dataset, wasCreated: false };
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
    include: {
      template: {
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          tags: true,
          translations: true,
        },
      },
      area: {
        select: {
          id: true,
          name: true,
          countryCode: true,
          bounds: true,
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
      watchers: {
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

  if (!area) {
    try {
      const osmData = await fetchOsmRelationData(areaId);
      if (osmData) {
        area = await prisma.area.upsert({
          where: { id: areaId },
          update: {
            name: osmData.name,
            countryCode: osmData.countryCode,
            bounds: osmData.bounds,
            geojson: JSON.parse(JSON.stringify(osmData.convertedGeojson)),
          },
          create: {
            id: areaId,
            name: osmData.name,
            countryCode: osmData.countryCode,
            bounds: osmData.bounds,
            geojson: JSON.parse(JSON.stringify(osmData.convertedGeojson)),
          },
        });
      } else {
        const areaDetails = await getAreaDetailsById(areaId);
        if (!areaDetails) {
          throw new Error(`Area not found: ${areaId}`);
        }

        area = await prisma.area.upsert({
          where: { id: areaId },
          update: {
            name: areaDetails.name,
            countryCode: areaDetails.countryCode,
            bounds: areaDetails.boundingBox
              ? JSON.stringify(areaDetails.boundingBox)
              : null,
            geojson: Prisma.JsonNull,
          },
          create: {
            id: areaId,
            name: areaDetails.name,
            countryCode: areaDetails.countryCode,
            bounds: areaDetails.boundingBox
              ? JSON.stringify(areaDetails.boundingBox)
              : null,
            geojson: Prisma.JsonNull,
          },
        });
      }
    } catch (error) {
      console.error("Failed to fetch area data:", error);
      throw new Error(`Failed to fetch area data: ${areaId}`);
    }
  }

  try {
    const queryString = template.overpassQuery.replace(
      /\{OSM_RELATION_ID\}/g,
      areaId.toString()
    );

    const overpassData = await executeOverpassQuery(queryString);
    const geojsonData = convertOverpassToGeoJSON(overpassData);
    const bbox = calculateBbox(geojsonData);
    const datasetStats = extractDatasetStats(overpassData);
    const dataset = await prisma.dataset.create({
      data: {
        templateId: template.id,
        areaId: area.id,
        cityName: area.name,
        isActive: true,
        geojson: JSON.parse(JSON.stringify(geojsonData)),
        bbox: bbox ? JSON.parse(JSON.stringify(bbox)) : null,
        dataCount: overpassData.elements.length,
        lastChecked: new Date(),
        stats: JSON.parse(JSON.stringify(datasetStats)),
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            tags: true,
            translations: true,
          },
        },
        area: {
          select: {
            id: true,
            name: true,
            countryCode: true,
            bounds: true,
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
        watchers: {
          select: {
            id: true,
            userId: true,
            createdAt: true,
          },
        },
      },
    });

    // Resolve template translations for the given locale
    const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);

    return {
      ...dataset,
      template: resolvedTemplate,
    };
  } catch (error) {
    console.error("Failed to fetch Overpass data:", error);

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
      if (error.message.includes("Overpass API error")) {
        throw new Error(`Overpass API error: ${error.message}`);
      }
    }

    throw new Error(
      `Failed to fetch dataset data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
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
          watchers: true,
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
