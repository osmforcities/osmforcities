# Vendored basemap style

`positron.json` is an unmodified copy of `https://tiles.openfreemap.org/styles/positron`, fetched 2026-11-09. The wash layer is inserted at runtime in `src/lib/map-tiles.ts`.

The copy is pinned so an upstream change cannot move the `beforeId` anchor that keeps basemap labels above the dataset layers. To update, refetch the URL and run the `map-tiles` unit test; the anchor is derived from the file, not hardcoded.

Tiles, glyphs and sprites load from OpenFreeMap at runtime. Attribution comes from the source TileJSON.

## Licences

- OpenFreeMap styles (github.com/hyperknot/openfreemap-styles): MIT.
- Positron is forked from openmaptiles/positron-gl-style. Its code is released under the BSD 3-Clause License; its design under CC BY 4.0.
- The Positron GL Style is derived from CartoDB Basemaps designed by Stamen and Paul Norman for CartoDB Inc., licensed under CC BY 3.0.
- Map data from OpenStreetMap: https://www.openstreetmap.org/copyright

Sources: the openfreemap-styles README and github.com/hyperknot/openfreemap/blob/main/LICENSE.md.
