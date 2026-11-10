# Map Rendering

Shared decisions for all dataset maps (dataset page + home featured card).

## View state (zoom-to-area)

`computeInitialViewState(area, dataBounds)` in `src/lib/utils.ts` is the single entry point — no hand-rolled `fitBounds` in map components.

1. Small area bbox (span <= 0.25 deg): fit area bounds.
2. Else center on the admin centre at zoom 12 — large bboxes are untrustworthy. If the centre is far from the data bbox, fit data bounds instead.
3. Fallback: area bounds -> data bounds -> world.

New map surfaces must select `bounds`, `centerLat`, `centerLon` on the area and go through this function.

## Basemap

**OpenFreeMap `positron`** (vector, OpenMapTiles schema) since [#737]. The style is vendored at `src/lib/basemap/positron.json` and wired in `src/lib/map-tiles.ts`. Tiles, glyphs and sprites load from OpenFreeMap; no API key.

A vector basemap is required for labels above the data (below), label language ([#361]) and a dark style ([#467]).

Terms: attribution is required. MapLibre adds it from the source TileJSON (OpenFreeMap, OpenMapTiles, OpenStreetMap), so the attribution control stays. The public instance has no SLA; self-hosting the OpenFreeMap build is the fallback. Licences of the vendored style are in `src/lib/basemap/NOTICE.md`.

**Basemap labels render above the dataset layers.** Every dataset layer (geojson and tiles groups, AOI boundary, selection highlight) mounts with `beforeId={BASEMAP_LABELS_ANCHOR}`, the style's first symbol layer. The wash sits just below that layer. A new data layer must pass the same `beforeId`, or MapLibre appends it on top of the labels.

## Style

Single source of truth: `src/components/dataset/map/layers/map-style.ts` (`DEFAULT_STYLE_KNOBS`). Rationale for each choice is commented inline there. Highlights: Viridis age ramp (dark = recent), washed basemap, olive AOI boundary, size reinforces recency. Live-tune via the dev-only Tune panel (osmforcities-map-style-tuning skill).

## Test datasets

Verify zoom/style changes on BOTH the dataset page and the home featured card. Populate by opening `/en/area/<areaId>/dataset/<templateId>`, which creates the dataset (never SQL), feature via the dataset page admin button.

| Dataset | Relation | Exercises |
| --- | --- | --- |
| Bus Stops in Luanda | 1802546 | Large bbox -> admin-centre path, sparse points |
| Banks in Altamira | 185554 | Huge municipality, tight data cluster |
| Cycleways in Recife | 303585 | Small-bounds control — must fit area bounds |
| Cycleways in Amsterdam | 271110 | Just-over-threshold city, dense lines |
| Bus Stops in Sao Paulo | 298285 | Large bbox, 18k points (density/perf) |

[#467]: https://github.com/osmforcities/osmforcities/issues/467
[#737]: https://github.com/osmforcities/osmforcities/issues/737
[#361]: https://github.com/osmforcities/osmforcities/issues/361
