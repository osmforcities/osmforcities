# Map Rendering

Decisions and direction for all dataset maps (dataset page + home featured card), plus the canonical dataset list for testing map changes.

## View state (zoom-to-area)

`computeInitialViewState(area, dataBounds)` in `src/lib/utils.ts` is the single entry point for the initial view of every dataset map. Do not hand-roll `fitBounds` logic in map components.

Decision tree:

1. Area bbox small (span <= 0.25 deg, `isSmallAreaBounds`): fit area bounds, padding 20.
2. Area has admin centre (`centerLat`/`centerLon`, from OSM `admin_centre` or Nominatim): center on it at zoom 12 (`DATASET_MAP_DEFAULT_ZOOM`) — large bboxes are untrustworthy (scattered boundaries, huge municipalities).
   - Far-center guard: if the centre is >~5.5 km outside the data bbox, fit data bounds instead (bad Nominatim centroid).
3. Fallback chain: area bounds -> data bounds -> world view.

Consumers:

- Dataset page: `use-map-data.ts` (has data bounds server-side, guard active on first paint).
- Featured home card: `featured-dataset-map-client.tsx` (geojson loads client-side; first paint uses area only, refits when data arrival changes the outcome — including on client-side nav, which swaps props without remounting the map).

Any new dataset map surface must select `bounds`, `centerLat`, `centerLon` on the area and go through `computeInitialViewState`.

## Style direction (2026-07)

Single source of truth: `src/components/dataset/map/layers/map-layers.tsx` (`DEFAULT_STYLE_KNOBS`, builders, `AGE_PALETTES`). Legend and AOI boundary import from it — no color drift.

- Age coloring: sequential single-hue BluGrn ramp, dark = recent. At 1-3px dot sizes luminance is the only channel that carries; color-blind safe. The very-old majority stays pale and recedes (figure/ground, ciclomapa-style).
- Recent edits (<1% of features): drawn on top via sort-key, +1 radius boost, white halo.
- Basemap: muted by a white wash layer at 0.4 opacity (`src/lib/map-tiles.ts`).
- AOI boundary: design-token olive-500 `#57814c` — reads as chrome, not data.
- Live tuning: dev-only Tune panel on dataset pages; bake values back into `DEFAULT_STYLE_KNOBS` (see osmforcities-map-style-tuning skill for the workflow).

## Test datasets

Canonical matrix for verifying zoom or style changes. Check each on BOTH the dataset page and the home featured card (feature them via the dataset page admin button).

| Dataset | Area (OSM relation) | Exercises |
| --- | --- | --- |
| Bus Stops in Luanda | 1802546 (province, ~1.9 deg span) | Large bbox -> admin-centre path; sparse points |
| Banks in Altamira | 185554 (huge municipality, ~4 deg span) | Admin centre with tight data cluster; far-center tolerance |
| Cycleways in Recife | 303585 (~0.2 deg span) | Small-bounds control — must fit area bounds |
| Cycleways in Amsterdam | 271110 (0.35 deg lon span) | Just-over-threshold city; dense line rendering |

Expected: Luanda/Altamira/Amsterdam center on the city at zoom 12; Recife fits its bounds; featured card matches the dataset page for all four.

Populate via the app, not SQL: `POST /api/datasets` with `{ templateId, osmRelationId }` (signed in, Overpass tunnel up), then feature each via the dataset page.
