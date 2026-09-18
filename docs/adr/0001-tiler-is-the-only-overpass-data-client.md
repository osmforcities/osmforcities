# The tiler is the only thing that fetches full datasets

The app used to fetch every dataset itself and ship it whole to the browser, which broke past a few hundred thousand features. Now one service, the tiler, fetches from Overpass, converts, computes stats and bakes the map archive; the app asks Overpass only the count question and pulls the tiler's outputs. One data path for every size, and the heavy fetch stays next to Overpass.

## Consequences

- Every first load of a new dataset waits for a bake, small ones included. The wait page exists because of this.
- A refresh is a request, not a result: the page keeps serving the previous archive and stats until the new bake lands.
- If the tiler is down, datasets keep serving what they have and refreshes queue up, as when Overpass is down.

## Considered

Tiler only above the cap, in-app fetch below. Rejected: two first-load experiences and two stats pipelines that drift.
