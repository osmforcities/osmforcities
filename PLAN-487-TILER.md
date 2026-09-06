# App ↔ tiler integration: submit, poll, pull, serve, surface (issue #487 phases 1–2, app side)

## Context

The tiler (overpass-pmtiler) is done and API-stable (`overpass-pmtiler/API.md`). The app has
**zero** tiler code today. This branch wires the full app-side loop: every snapshot submits a
bake job, the existing cron tick polls it, `done` jobs are pulled to app disk and served with
Range support, and job state is visible on the admin datasets page, the user dashboard, and the
dataset detail page. **Additive only** — the app's own Overpass fetch/geojson/stats path is
untouched, so a tiler outage regresses nothing. The #489 render swap and nginx/Cloudflare infra
are explicitly out.

Facts that shape the design (verified):
- No `DatasetSnapshot` model — a snapshot is columns flattened onto `Dataset`
  (`snapshotDatasetColumns()` in `src/lib/dataset-snapshot.ts:146` is the single seam).
- Four snapshot callers: `getOrCreateDataset` (`src/lib/dataset-operations.ts:214`),
  `POST /api/datasets` (`src/app/api/datasets/route.ts:92`), admin refresh
  (`src/app/api/datasets/[id]/refresh/route.ts:60`), cron
  (`src/app/api/tasks/update-datasets/route.ts:56`).
- Template queries end `out geom meta;` (`prisma/lib/template-parser.ts:265`) — exactly the
  tiler's required shape; pass the same `rawQuery` through unchanged.
- Env pattern: module-level `process.env.X || default` (`src/lib/overpass/transport.ts:11`).
- Tiler contract: `POST /jobs {id, query, filterableTags?}` idempotent by id; states
  `queued|fetching|converting|baking|done|failed`; `errorKind:"too_large"` = permanent;
  outputs swept after 7 days; `DELETE` = ack.

## Worktree

No existing branch/worktree for this (checked). Create via the **osmforcities-worktree** skill:
branch `feat/487-tiler-client` off `develop`, own port + DB container. All work there.

**Local prototype mode:** everything stays on this machine — no push, no PR. First commit
copies this plan into the worktree as `PLAN-487-TILER.md` (kept updated as steps land, so the
work survives a lost session; dropped from the branch before any future PR).

## Steps (one commit each, app in a working state after every one)

### 1. Schema migration
`prisma/schema.prisma` — four nullable columns on `Dataset`:
```prisma
tilesJobId     String?
tilesState     String?    // "pending" | "done" | "failed"
tilesUpdatedAt DateTime?  // set when outputs are pulled; presence = tiles ready
tilesError     String?    // tiler failure text; separate from lastError so an
                          // additive tiles failure never dirties the dataset row
```
`prisma migrate dev`. Index not needed (poll query scans `tilesState: "pending"`, tiny N).
Decided against a `DatasetSnapshot` model for now: with "only the latest snapshot exists"
semantics it's a pass-through join for every reader. Revisit at #487 phase 3 when two
snapshots must coexist (blue/green tile swap); these four columns migrate trivially then.

### 2. Tiler client — `src/lib/tiler/client.ts`
Stdlib `fetch`, module consts `TILER_URL = process.env.TILER_URL` (unset ⇒ integration
disabled, the kill switch) and `TILES_DIR = process.env.TILES_DIR || "./data/tiles"`.
- `tilerEnabled()`
- `submitTileJob({ id, query, filterableTags })` → POST /jobs (202/200 both OK)
- `getTileJob(id)` → GET /jobs/:id
- `downloadTileOutputs(id)` → streams `output.pmtiles` to `TILES_DIR/{id}.pmtiles` and
  `stats.json` to `TILES_DIR/{id}.stats.json` (first `fs` use in the app — write via temp
  file + rename so a crashed pull never serves a partial archive)
- `ackTileJob(id)` → DELETE /jobs/:id
Job id: `{datasetId}-{epochSeconds}` at submit time (matches tiler `[A-Za-z0-9._-]{1,128}`;
cuid is alphanumeric). Unit test with mocked `fetch` (existing vitest patterns,
cf. `src/lib/overpass/__tests__/transport.test.ts`).

### 3. Submit on snapshot
Helper in the client module: `submitTilesColumns(datasetId, rawQuery, filterableTags)` —
submits and returns `{ tilesJobId, tilesState: "pending" }`, or `{}` when disabled, or on
tiler error logs and returns `{ tilesState: "failed", tilesError }` (never throws — a tiler
outage must not fail the snapshot). Spread it next to `snapshotDatasetColumns(snapshot)` at
all four call sites. `filterableTags` from the template (matches stored
`stats.filterDimensions` semantics per #487).

### 4. Poll pass on the cron tick
In `src/app/api/tasks/update-datasets/route.ts`, after the refresh loop: fetch datasets with
`tilesState: "pending"`, for each `getTileJob`:
- `done` → `downloadTileOutputs`, set `tilesState: "done"`, `tilesUpdatedAt: now`, clear
  `tilesError`, `ackTileJob`, prune this dataset's older `{datasetId}-*.pmtiles` files
  keeping current + previous (#487 rule)
- `failed` → `tilesState: "failed"`, `tilesError` = error text (prefix `too_large:` when
  `errorKind` set, so we never blind-retry a permanent refusal)
- 404 (swept) → `tilesState: "failed"`, `tilesError: "job expired before pull"` — the next
  24 h snapshot resubmits naturally
- still running → leave pending
Include the poll outcome counts in the route's JSON response (it already reports its work).

### 5. Serve archives with Range — `src/app/api/tiles/[name]/route.ts`
GET only; `name` validated `[A-Za-z0-9._-]+\.pmtiles` (no traversal); reads from `TILES_DIR`;
supports `Range` (single range, 206/416) since the pmtiles protocol is Range-driven;
`Cache-Control: public, max-age=31536000, immutable` (filenames are content-versioned by
epoch). Tiles URL is derived, never stored: `/api/tiles/{tilesJobId}.pmtiles`. Nginx can
later shadow this exact path.

### 6. Surface state on the three pages (+ i18n, English keys in `messages/en.json`)
- **Admin datasets** (`src/app/[locale]/datasets/page.tsx`): also include rows with
  `tilesState: "failed"` in the flagged list; per-row tiles badge (pending/done/failed) and
  `tilesError` text alongside the existing `lastError`.
- **User dashboard** (`src/app/[locale]/dashboard/page.tsx` grid): small badge on the card
  only when tiles are not ready — "Tiles processing" / "Tiles failed"; nothing when done
  (quiet default).
- **Dataset detail** (`dataset-interactive-section.tsx` area): one-line informational notice
  while `tilesState === "pending"` ("Map data is being processed for faster rendering") —
  the map itself still renders geojson until #489.
- Badge styling from design-system tokens (existing badge components if present).
- If `pnpm type-check` fails on `NamespacedMessageKeys`, delete `messages/en.d.json.ts`.

### 7. Config + docs
- `.env.example` + `.env.worktree.template`: `TILER_URL` (commented, with the localhost:8099
  dev value), `TILES_DIR`.
- `data/tiles/` in `.gitignore`.
- `app/docs/features/large-datasets.md`: short "implemented" note for the app-side loop;
  check off #487 phase-2 boxes when the PR lands.

## Verification

- `pnpm type-check`, `pnpm lint`, unit tests (client + poll reconciliation with mocked fetch).
- End-to-end in the worktree: start the Overpass tunnel; run the tiler locally
  (`PMTILER_OVERPASS=https://localhost:8080/api/interpreter PMTILER_INSECURE=1
  python3 pmtiler.py`); set `TILER_URL=http://127.0.0.1:8099` in the worktree env; create a
  small dataset **via the app flow** (`POST /api/datasets`); hit the cron route with
  `CRON_ROUTE_SECRET` until the job completes; assert the archive lands in `TILES_DIR`,
  `GET /api/tiles/{jobId}.pmtiles` answers 206 to a Range request, and all three pages show
  the right state (isolated chrome-devtools MCP).
- Failure path: stop the tiler, refresh a dataset — snapshot still succeeds, `tilesState`
  reflects the outage, cron keeps running.

## Out of scope
- #489 render swap (map stays on geojson), nginx/Cloudflare serving + Cache Rule (infra
  repo), metro async lane (#490), download UX (#500), tiler-side changes (none needed).

## After implementation
Local prototype only: commits stay in the worktree, nothing is pushed, no PR is opened.
`PLAN-487-TILER.md` in the worktree tracks progress per step. When you're comfortable with
the result, a future session cleans the plan file off the branch and opens the draft PR
against `develop` — on your explicit go.
