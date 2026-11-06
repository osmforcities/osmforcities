# Vendored basemap style

`positron.json` is a pinned copy of `https://tiles.openfreemap.org/styles/positron`,
fetched 2026-09-07. Unmodified — the wash layer is inserted at runtime in
`src/lib/map-tiles.ts`, not baked into this file.

Pinned rather than fetched so an upstream style change cannot break the
`beforeId` anchor that keeps basemap labels above the dataset layers. Re-vendor
by refetching the URL; the anchor is derived from the file, not hardcoded.

Tiles, glyphs and sprites are still served by OpenFreeMap at runtime, and the
attribution comes from the source TileJSON.

## Licences

- OpenFreeMap styles repo (github.com/hyperknot/openfreemap-styles): MIT,
  Copyright (c) 2023 Zsolt Ero.
- Positron is a fork of openmaptiles/positron-gl-style. Style **code** is
  BSD 3-Clause; style **design** is CC BY 4.0.
- Positron is derived from CartoDB Basemaps, designed by Stamen and Paul Norman
  for CartoDB Inc., licensed CC BY 3.0.
- Map data from OpenStreetMap: https://www.openstreetmap.org/copyright
