# Large Datasets (vector tiles + metro-scale extraction)

Architecture for datasets beyond the 25 MB interactive cap (epic #322).
Decided 2026-09-04 from live capacity probes against our Overpass instance
(spike record: SPIKE-CHUNKING.md at repo root, uncommitted). Chunked extraction
was designed, probed, and discarded the same day — single-query extraction wins.

## Decision summary

- Per-dataset static PMTiles baked by tippecanoe after each snapshot (#487),
  rendered by the client instead of inline RSC geojson (#489).
- Metro-scale creation: ONE Overpass query with a raised per-query
  `[maxsize:]` — no chunking, no Overpass server config changes. Runs async
  through the cron queue; UI shows "processing, check back later".
- Above the interactive cap, the stored representation is an nd-geojson file
  on disk, not JSONB. Snapshot stats are computed in the same streaming pass
  (all stats are accumulator-shaped).
- Refresh: full refetch at low cadence. `[adiff:]` deltas are impossible on
  our instance (DB imported without attic data; re-import ~doubles disk and
  does not fit).

## Measured facts (2026-09-04, our instance: 12 vCPU / 64 GB / defaults)

Overpass `maxsize` is driven by area evaluation, not output size (a 210 MB
result fits in a 64 MiB budget). Per-query defaults: 512 MiB / `timeout:25`.

| stage | São Paulo buildings (rel 298285, 2.14M elements) |
| --- | --- |
| count probe | 64s at >= 640 MiB maxsize (fails at default 512 MiB) |
| full fetch (`out geom meta`) | 2.23 GB in 312s at 768 MiB maxsize |
| stream-convert to nd-geojson | 64s, 13 MB peak RSS |
| tippecanoe bake (`-zg --drop-densest-as-needed -P`) | 194s, 1.2 GB peak RSS |
| output | 53 MB PMTiles (42:1 vs wire) |

Pipeline total: ~10 min for a 2.1M-element metro.

Implementation constraints discovered:

- The app's count-probe HTTP timeout (30s, `src/lib/overpass/transport.ts`)
  is too short for metro counts (64s) — the async lane needs its own budget.
- Count-probe OOM/timeout must route to the async lane, not to a cached
  `timeout` verdict (today it blocks the area+template for the TTL).
- Streaming conversion: split the `elements` array on element boundaries and
  `JSON.parse` per element. Token-level streaming (stream-json) is ~40x slower
  at the same bounded memory. osmtogeojson is unusable here (superlinear,
  whole-collection).
- Usable per-query maxsize ceiling on our instance is between 1 and 3 GiB;
  requests >= 4 GiB fail with an areas-dispatcher protocol error.

## Worst-case bounds

`building` is the largest OSM key (707M objects globally, 2.3x highway) —
buildings is the densest template. Density is import-driven, not
population-driven (CDMX 143k / Cairo 72k / Buenos Aires 41k vs Jakarta 1.66M /
Dar es Salaam 1.36M / Lagos 1.31M / NYC and LA ~1.1M).

No 20 GB dataset exists at metro or state level. São Paulo state = 2.7M
(~2.8 GB wire), only 26% above the municipality. Only country-level picks could
reach tens of GB. The app has no area-type gate (any Nominatim relation is
selectable, including countries), so the async lane needs an explicit upper
bound: count probe over a hard ceiling => refuse, don't attempt.

## Canonical stress datasets

| Case | Area | Relation | Buildings | Exercises |
| --- | --- | --- | --- | --- |
| standard metro | São Paulo (municipality) | 298285 | 2.14M | full async pipeline, import-dense |
| state pick | São Paulo (state) | 298204 | 2.71M | biggest known servable area |
| must fail gracefully | Tokyo Metropolis | 1543125 | >3 GiB to even count | over-ceiling refusal path |

## Rollout posture (2026-09-04): exploration only, no migration yet

Deliberately cautious. NO app code has changed; everything so far is probes,
docs, and throwaway assets (preserved in `spikes/2026-09-04-large-datasets/`,
locally git-ignored via .git/info/exclude — includes the render harness, probe
scripts, streaming converter, and the baked 53 MB SP archive). The existing
geojson path stays untouched until the tiler-service exploration below settles
the architecture. Any future app work lands behind a flag / in a worktree /
as a draft PR first.

## overpass-pmtiler: settled design (2026-09-05)

Extraction+bake service co-located on the Overpass box. Name `overpass-pmtiler`;
developed in its own (currently private) repo, deployed by an ansible role
`pmtiler` (systemd unit `pmtiler.service`, nginx location `/pmtiler/` on the
existing IP-allowlisted vhost — app IPs are already in `overpass_allowed_ips`,
nothing new is exposed).

Decisions (brainstorm 2026-09-05):

- **App box pulls outputs.** On `done`, app downloads the archive + stats to
  its own disk and serves via existing nginx/CF. Overpass box stays private;
  serving path identical for small and metro datasets.
- **ALL datasets bake via the tiler.** One bake path; tippecanoe never runs on
  the 3.7 GB app box. #487 shrinks to "download + serve". Tiler down =>
  snapshots queue and retry via existing cron, same as Overpass being down.
- **Tiler is the single Overpass data client.** Job input is the Overpass
  query; tiler fetches via localhost (the 2.2 GB metro wire transfer
  disappears), stream-converts, computes stats, bakes. App's Overpass
  transport shrinks to the creation-time count probe (with the over-ceiling
  refusal in front).

Contract (`id` supplied by app = `{datasetId}-{snapshotVersion}`; idempotent —
POST of an existing id returns its current state):

```
POST   /pmtiler/jobs      { id, query, maxsize, timeout } -> 202 { id, state }
GET    /pmtiler/jobs/:id  -> { state: queued|fetching|converting|baking|done|failed,
                               startedAt, error?, stats? }
GET    /pmtiler/jobs/:id/output.pmtiles
GET    /pmtiler/jobs/:id/stats.json
GET    /pmtiler/jobs/:id/data.ndjson   (small datasets: app pulls to fill JSONB;
                                        metro export: app proxies on demand)
DELETE /pmtiler/jobs/:id               (app acks after pull -> cleanup)
```

Internals — deliberately boring: one Python service (spike `convert_fast.py`
is ~80% of the convert stage), jobs run **one at a time** off a queue, job
state = one JSON file per job in a spool dir, no database. Fetch = streamed
localhost `POST /api/interpreter` to disk. Bake = apt tippecanoe under `nice`.
Serial execution doubles as contention control: at most one bake competes with
live Overpass queries. Cleanup: DELETE on ack + cron sweep of jobs older than
N days (disk: 269 G free, ~3 GB transient per metro job).

App side: snapshot flow = submit -> poll on the existing cron tick (no new
scheduler) -> pull outputs -> serve from app nginx. Dataset status maps from
job state; "processing, check back later" is `state != done`. `failed`
carries the Overpass error text through.

Main real work item: relation/multipolygon assembly in the convert stage —
the spike skipped relations (15,783 in SP buildings).

Open (measure before build): query-latency impact on live Overpass while a
bake runs (checklist item that still needs a probe).

## Validation status / next steps

1. ~~client tile rendering~~ **VALIDATED (2026-09-04, standalone harness)**.
   SP archive (53 MB, 2.1M features, numeric `_ts`) via MapLibre + pmtiles
   protocol, app's 4-band Viridis age ramp as a `step` expression on `_ts`:
   - full-city first idle **538 ms** (9 tiles); z14.5 center detail idle
     **645 ms** (30 tiles); z12 350 ms; **JS heap 76 MB** — vs 1.19 GB tab heap
     for inline-geojson Amsterdam (10x fewer features). #407-class failures
     structurally impossible: memory is O(viewport), not O(dataset).
   - `-zg` picked maxzoom 14; individual footprints crisp at z14.5; low-zoom
     overview shows drop-densest sampling (expected, reads as density map).
   - `_ts` must be numeric epoch (bake spec #487) — a string `_ts` silently
     breaks the `step` expression.
   - Harness + archive preserved in `spikes/2026-09-04-large-datasets/`.
2. ~~overpass-box tiler service exploration~~ **SETTLED (2026-09-05)** — design
   above; service work tracked in the overpass-pmtiler repo (milestone v0.1 =
   one SP-class job end-to-end; issues 1-8 seeded 2026-09-05).
3. Contention probe: measure live Overpass query latency while a bake runs on
   the box (only remaining pre-build measurement).
4. Rewrite #490 (and touch up #487) to the settled design; service work items
   tracked in the overpass-pmtiler repo.
5. Then: app-side work (#489 protocol + vector source) in a worktree, behind a
   flag, landed as a draft PR first.
