# Glossary

One meaning per word. When two words exist for the same thing, the first wins and the rest go under _Avoid_.

## Places and data

**Area**: A city or administrative region, identified by its OpenStreetMap relation id. _Avoid:_ city, region, boundary.

**Area page**: The page at `/area/{id}` where people browse an Area's Templates: common datasets, a topic picker and search. Topic and category pages sit below it. _Avoid:_ hub, area hub, landing.

**Overpass**: The query service the app asks for OpenStreetMap data. Templates are written in its language. _Avoid:_ OSM API, the database.

**Template**: A named Overpass question, such as "bicycle parking" or "buildings". Applied to an Area it defines a Dataset. _Avoid:_ query, layer.

**Topic**: A top-level Category, such as Mobility or Health. Groups Categories on the area page. _Avoid:_ super-category, group.

**Category**: A grouping of Templates under a Topic, such as Bicycle under Mobility. A Template belongs to exactly one, or directly to a Topic. _Avoid:_ tag, type.

**Dataset**: One Template applied to one Area: its features, stats and map. The thing people open, save and share. _Avoid:_ monitor, layer, snapshot.

**Feature**: One OpenStreetMap object (node, way or relation) in a Dataset: a bench, a bus stop, a building. _Avoid:_ resource, item, record.

**Snapshot**: The result of asking Overpass for a Dataset at one point in time. A refresh replaces it. _Avoid:_ fetch, run, update (a refresh is the act, a snapshot is the result).

**Stats**: The numbers derived from a snapshot: feature counts, geometry mix, edit recency, mappers, tag coverage. _Avoid:_ metrics, analytics.

**Save**: A person's follow relationship to a Dataset. Saved datasets appear on the dashboard and in report emails. _Avoid:_ watch, subscribe, follow, bookmark.

## Size

**Count probe**: The quick "how many elements are there?" question sent to Overpass before a Dataset's first bake. On the tiles-only lane it runs after the page response. _Avoid:_ pre-flight, size check, estimate.

**Verdict**: The remembered outcome of a count probe: ok, too large, or timed out. Saves asking the same expensive question again too soon. _Avoid:_ cache, size check result.

**Cap**: The estimated size above which the app never fetches a Dataset's features itself. _Avoid:_ limit, threshold, max size.

**Over-cap dataset**: A Dataset above the cap. The app stores none of its features; map and stats come from the archive. _Avoid:_ large, heavy, big, metro (metro describes an Area, not a Dataset).

**Tiles-only lane**: The path every Dataset takes once the map renders archives: creation counts, then bakes, and every refresh bakes. The app never fetches the features itself. _Avoid:_ async lane, slow lane, large-dataset path.

## Map building

**Tiler**: The service that turns a Template into a map archive. The only thing that fetches full Datasets from Overpass. Code: [osmforcities/overpass-pmtiler](https://github.com/osmforcities/overpass-pmtiler). _Avoid:_ baker, pmtiler, tile server.

**Bake**: One run of the tiler for one Dataset: queued, fetching, converting, baking, then done or failed. _Avoid:_ job (in prose), processing, build. Exception: UI copy shown to visitors may say "building the map", since "bake" is jargon to them. Code, docs and commits keep "bake".

**Archive**: The single map file a bake produces. Browsers read only the part they are looking at. _Avoid:_ tiles file, PMTiles (the format, not the thing), tileset.

**Served archive**: The archive a Dataset's map currently uses. A rebuild does not change it until the new archive has fully landed. _Avoid:_ current tiles, live archive.

**Tiles state**: The app's view of a Dataset's latest bake: counting (the count probe runs, no bake yet), pending, done, or failed. _Avoid:_ job state, bake status (the tiler's stages are finer than this).

**Reconcile**: Checking on a pending bake and pulling the finished archive and stats into the app. _Avoid:_ poll, sync, pull.

**Rebuild**: A bake for a Dataset that already has a served archive, triggered by the scheduled refresh or an admin. _Avoid:_ refresh (the act that requests it), re-bake.

**Backfill**: The one-time bake of every existing Dataset before the map switches to archives for everyone. _Avoid:_ migration, catch-up.

**Feature fill**: Storing an under-cap Dataset's features from the tiler's output so the download keeps working. _Avoid:_ backfill (taken, see above), geojson fill.

## Waiting

**Wait page**: The full page between opening a Dataset for the first time and seeing its map. Four moods: counting, baking, failed, timed out (Overpass gave up on the count probe). _Avoid:_ loading state, skeleton, processing panel.

**Ready notification**: A one-time email asked for on a dataset with no map yet, sent once when a bake with features lands, never for a failure. Asking is saving with the flag set; unsaving cancels it. _Avoid:_ alert, subscription, report (reports are the recurring saved-dataset emails).
