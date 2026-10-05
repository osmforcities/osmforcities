# The tiler is the only thing that fetches full datasets

The app used to fetch every dataset itself and ship it whole to the browser, which broke past a few hundred thousand features. Now one service, the tiler, fetches from Overpass, converts, computes stats and bakes the map archive; the app asks Overpass only the count question and pulls the tiler's outputs. One data path for every size, and the heavy fetch stays next to Overpass.

## Consequences

- Every first load of a new dataset waits for a bake, small ones included. The wait page exists because of this.
- A refresh is a request, not a result: the page keeps serving the previous archive and stats until the new bake lands.
- If the tiler is down, datasets keep serving what they have and refreshes queue up, as when Overpass is down.
- The tiler becomes required once the app stops fetching data itself. From then on, without a tiler (`TILER_URL` unset) the app can still check how big a dataset would be, but cannot create it, and there is no fallback inside the app, including for self-hosting. Until that change lands, the app still creates small datasets with its own fetch when the tiler is off.

## Considered

- Let the tiler handle only datasets over the size cap, and have the app keep fetching the small ones itself. Rejected: people would get two different first-load experiences, and two separate pieces of code computing the stats would slowly disagree.
- Revisited on 2026-10-05 in three forms: keep the app's own fetch for small datasets; keep it only for people running the app without a tiler; or show the raw data straight away and switch to the tiled map when it is ready. All three were rejected after timing them. For a small dataset, waiting for the tiler costs only 0.3 to 3.2 seconds more than the app fetching the data itself ([measurements][measured]). Drawing the map from geojson would not make it faster on its own, because in this design the geojson arrives from the tiler at the same moment as the map tiles. Only a second download from Overpass would make the first map appear sooner.
- Running the app without a tiler (self-hosting): nobody has asked for it, and anyone self-hosting needs their own Overpass server with area support anyway, which is the bigger hurdle. Making the tiler easy to run next to the app is tracked in [#560].

## Revisit when

- A small dataset takes more than 30 seconds to show its map through the tiler, on an area Overpass has seen recently.
- People who want to self-host ask for a way to run without the tiler, even after [#560] has made the tiler easy to set up.

[measured]: ../features/large-datasets.md#small-dataset-time-to-map-2026-10-05
[#560]: https://github.com/osmforcities/osmforcities/issues/560
