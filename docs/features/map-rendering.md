# Map Rendering

Shared decisions for all dataset maps (dataset page + home featured card).

## View state (zoom-to-area)

`computeInitialViewState(area, dataBounds)` in `src/lib/utils.ts` is the single entry point — no hand-rolled `fitBounds` in map components.

1. Small area bbox (span <= 0.25 deg): fit area bounds.
2. Else center on the admin centre at zoom 12 — large bboxes are untrustworthy. If the centre is far from the data bbox, fit data bounds instead.
3. Fallback: area bounds -> data bounds -> world.

New map surfaces must select `bounds`, `centerLat`, `centerLon` on the area and go through this function.

## Style

Single source of truth: `src/components/dataset/map/layers/map-style.ts` (`DEFAULT_STYLE_KNOBS`). Rationale for each choice is commented inline there. Highlights: Viridis age ramp (dark = recent), white-washed basemap, olive AOI boundary, size reinforces recency. Live-tune via the dev-only Tune panel (osmforcities-map-style-tuning skill).

## Test datasets

Verify zoom/style changes on BOTH the dataset page and the home featured card. Populate via `POST /api/datasets {templateId, osmRelationId}` (never SQL), feature via the dataset page admin button.

| Dataset | Relation | Exercises |
| --- | --- | --- |
| Bus Stops in Luanda | 1802546 | Large bbox -> admin-centre path, sparse points |
| Banks in Altamira | 185554 | Huge municipality, tight data cluster |
| Cycleways in Recife | 303585 | Small-bounds control — must fit area bounds |
| Cycleways in Amsterdam | 271110 | Just-over-threshold city, dense lines |
| Bus Stops in Sao Paulo | 298285 | Large bbox, 18k points (density/perf) |
