/**
 * Catalog filter for dataset listings.
 *
 * Visiting a dataset page caches the row (area + dataset) via getOrCreateDataset.
 * Cache rows must not surface in any listing — only datasets that are explicitly
 * cataloged should appear. A dataset is cataloged when it is either admin-featured
 * or watched by at least one user.
 */
export const CATALOG_FILTER = {
  AND: [{ OR: [{ isFeatured: true }, { savedBy: { some: {} } }] }],
};
