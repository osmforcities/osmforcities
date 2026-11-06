# Map Rendering

Shared decisions for all dataset maps (dataset page + home featured card).

## View state (zoom-to-area)

`computeInitialViewState(area, dataBounds)` in `src/lib/utils.ts` is the single entry point — no hand-rolled `fitBounds` in map components.

1. Small area bbox (span <= 0.25 deg): fit area bounds.
2. Else center on the admin centre at zoom 12 — large bboxes are untrustworthy. If the centre is far from the data bbox, fit data bounds instead.
3. Fallback: area bounds -> data bounds -> world.

New map surfaces must select `bounds`, `centerLat`, `centerLon` on the area and go through this function.

## Basemap

**OpenFreeMap `positron`** (vector, OpenMapTiles schema), vendored at `src/lib/basemap/positron.json` and wired in `src/lib/map-tiles.ts`. Chosen [#737] after a side-by-side spike against Protomaps and VersaTiles.

Why: hosted, no API key, no request limits, commercial use allowed, and the most restrained ground of the candidates, so it stays quiet under the age ramp. Protomaps looks equivalent but its public build sends no CORS headers and self-hosting means a ~138 GB archive. VersaTiles works but its flavors carry saturated road and water colours that compete with the data. It replaced the CARTO raster, whose free key carried non-commercial terms and a 5M tiles/month cap.

Terms: attribution is required and MapLibre adds it from the source TileJSON (OpenFreeMap, OpenMapTiles, OpenStreetMap), so the attribution control stays. No SLA, no support; the public instance is donation-funded. Self-hosting their build is the fallback. Licences of the vendored style are in `src/lib/basemap/NOTICE.md`.

**Basemap labels render above the dataset layers.** Every dataset layer (geojson and tiles groups, AOI boundary, selection highlight) mounts with `beforeId={BASEMAP_LABELS_ANCHOR}`, the style's first symbol layer, so place names stay readable over dense features. The wash sits just below that layer. A new data layer must pass the same `beforeId`, or MapLibre appends it on top of the labels.

Dark basemap is deferred to [#467], which waits on the app theme state. Known needs: a separate age ramp (the current one is dark = recent, so recent features vanish on a dark ground), an inverted `point.strokeColor`, and wash at 0.

## Style

Single source of truth: `src/components/dataset/map/layers/map-style.ts` (`DEFAULT_STYLE_KNOBS`). Rationale for each choice is commented inline there. Highlights: Viridis age ramp (dark = recent), washed basemap, olive AOI boundary, size reinforces recency. `basemapWashOpacity` was retuned down when the basemap went vector — positron is already pale, so the 0.4 tuned against the CARTO raster over-muted it. Live-tune via the dev-only Tune panel (osmforcities-map-style-tuning skill).

## Test datasets

Verify zoom/style changes on BOTH the dataset page and the home featured card. Populate via `POST /api/datasets {templateId, osmRelationId}` (never SQL), feature via the dataset page admin button.

| Dataset | Relation | Exercises |
| --- | --- | --- |
| Bus Stops in Luanda | 1802546 | Large bbox -> admin-centre path, sparse points |
| Banks in Altamira | 185554 | Huge municipality, tight data cluster |
| Cycleways in Recife | 303585 | Small-bounds control — must fit area bounds |
| Cycleways in Amsterdam | 271110 | Just-over-threshold city, dense lines |
| Bus Stops in Sao Paulo | 298285 | Large bbox, 18k points (density/perf) |

[#467]: https://github.com/osmforcities/osmforcities/issues/467
[#737]: https://github.com/osmforcities/osmforcities/issues/737
