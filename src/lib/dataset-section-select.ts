import type { Prisma } from "@prisma/client";
import { CATALOG_FILTER } from "@/lib/dataset-catalog-filter";

/**
 * Prisma `select` shared by the dataset sections on the explore page and area
 * pages. Matches the shape consumed by the DatasetSections component.
 */
export const DATASET_SELECT = {
  id: true,
  cityName: true,
  dataCount: true,
  stats: true,
  areaId: true,
  templateId: true,
  createdAt: true,
  area: {
    select: {
      id: true,
      name: true,
      names: true,
      countryCode: true,
    },
  },
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
      translations: {
        select: {
          locale: true,
          name: true,
          description: true,
        },
      },
    },
  },
} as const;

export type DatasetSectionKey =
  | "featured"
  | "recentlyEdited"
  | "mostSaved"
  | "mostContributors"
  | "largest";

// Uniform card select: the section-specific scalars (lastEditedAt,
// contributorsCount, recentlyEditedCount) are cheap enough to fetch for every
// section in exchange for one shape across all of them.
const SECTION_SELECT = {
  ...DATASET_SELECT,
  lastEditedAt: true,
  contributorsCount: true,
  recentlyEditedCount: true,
  _count: { select: { savedBy: true } },
} as const;

const SECTION_QUERIES: Record<
  DatasetSectionKey,
  {
    where: Prisma.DatasetWhereInput;
    orderBy: Prisma.DatasetOrderByWithRelationInput;
  }
> = {
  featured: {
    where: { isFeatured: true, dataCount: { gt: 0 } },
    orderBy: { createdAt: "desc" },
  },
  recentlyEdited: {
    where: {
      isActive: true,
      dataCount: { gt: 0 },
      lastEditedAt: { not: null },
      ...CATALOG_FILTER,
    },
    orderBy: { lastEditedAt: "desc" },
  },
  mostSaved: {
    where: { isActive: true, dataCount: { gt: 0 }, savedBy: { some: {} } },
    orderBy: { savedBy: { _count: "desc" } },
  },
  mostContributors: {
    where: {
      isActive: true,
      dataCount: { gt: 0 },
      contributorsCount: { not: null },
      ...CATALOG_FILTER,
    },
    orderBy: { contributorsCount: "desc" },
  },
  largest: {
    where: { isActive: true, dataCount: { gt: 0 }, ...CATALOG_FILTER },
    orderBy: { dataCount: "desc" },
  },
};

/**
 * findMany args for one dataset section — the single source for the explore
 * index and the five see-all pages. The select stays a literal type so Prisma
 * infers the row shape; where/orderBy are wide so all sections share one
 * return type.
 */
export function sectionQueryArgs(section: DatasetSectionKey, take: number) {
  return { ...SECTION_QUERIES[section], select: SECTION_SELECT, take };
}
