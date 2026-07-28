# Template Management

How a template gets proposed, defined, validated against real cities, and shipped.
Written to be run by a coding agent end to end.

Templates are defined in `prisma/templates.yml` (logic) + `prisma/templates.i18n.yml`
(translations) and synced to the DB by `prisma/sync-templates.ts` (`pnpm db:sync`).
There is no admin UI — the YAML is the source of truth, and deploy runs the sync.

## Definitions

- **Template** — an OSM selector (`highway=bus_stop`) plus a category, icon, optional
  parent, and an optional `filterableTags` allow-list. Rows in `templates.yml`:
  `[id, query, category, icon?, parent?]`. Query syntax: `;` = OR, `&` = AND,
  `*`/empty = wildcard; `{OSM_RELATION_ID}` is substituted per area at fetch time.
- **Sub-template** — a template with a `parent`. Use it when the query is a strict
  subset/specialisation of a broader template (e.g. `bicycle-parking` under
  `bicycle-infrastructure`, `bus-stops` under `public-transit`). If it stands alone
  conceptually, keep it top-level.
- **filterableTags** — a curated allow-list of OSM tag *keys* (top-level
  `filterableTags:` map) that become interactive-legend "Color by" views and the
  "Critical coverage" stat block on the dataset dashboard. Absent → age view only.
  Each key needs a `TagLabel` entry in every `messages/*.json`.
- **Demonstrator** — an OSM relation id (top-level `demonstrators:` map) whose real
  data shows the template at its best. Curation only: validated by the sync, never
  written to the DB. The workflow reads it to decide which datasets to inspect/seed.

## The dashboard is the validation tool

There is no separate preview. To inspect a template, a **signed-in** agent opens
`/area/{relationId}/dataset/{templateId}` — the page creates the dataset on view
(fetches the Overpass snapshot + stats) and renders the real dashboard. Read numbers
live from the dashboard; do not copy them into the YAML (they drift as OSM changes).

Prerequisites: local dev server, signed in (osmforcities-dev-auth), Overpass tunnel up
(infra-overpass-tunnel). Resolve relation ids from Nominatim.

## Workflow

### 1. Propose

A template is worth adding when it maps a distinct civic need, has a clean selector
that is documented on the OSM wiki, and is neither so broad it trips the size cap nor
so rare it is empty in most cities.

### 2. Define in `templates.yml`

Add the row, pick a seeded `category`, decide parent (see sub-template above), add a
Lucide `icon` (validated by `pnpm generate-icons`). Add name/description to
`templates.i18n.yml`. Run `pnpm db:sync` to apply.

### 3. Choose `filterableTags` — tune from the dashboard

A key belongs in the allow-list only if it is **both**:

- **well covered** — a meaningful share of features carry it, and
- **not the same value on every feature** — or coloring is one flat blob.

Drop a key only when it is near-absent (`covered` on bus-stops) or truly single-valued
everywhere (`public_transport=platform`, which PTv2 co-tags on every stop). A *skewed*
distribution is fine and even valuable: `operator` on `bicycle-rental` is mostly one
value (a city has one bike-share system), but the stray outliers it surfaces — a second
operator, a mis-tagged dock — are exactly the data deviations OSM for Cities exists to
flag. Don't require an even spread.

Tune in both directions, using the dashboard's "Most used tags" list as the menu:

- **Reduce** — drop keys near-zero across the demonstrators.
- **Widen** — promote a high-usage, varied key. Coverage can be regional (rich in one
  demonstrator, mostly "Missing" in another); that is fine — the legend handles Missing.

For every key added, add a `TagLabel` in `messages/en.json`, `es.json`, and
`pt-BR.json`. Values render from `TagValue` with a raw fallback, so controlled-value
labels are optional. Re-run `pnpm db:sync` and reload the dashboard to confirm.

### 4. Pick demonstrators

Aim for a small set (up to ~5 for flagship templates) of cities with strong,
well-maintained tagging for this template. Two signals, in order:

1. **Community strength** — shortlist cities in active OSM communities. Use current
   Pascal Neis country stats (`https://osmstats.neis-one.org/?item=countries`, read for
   today's date) as the proxy.
2. **Dashboard confirmation** — open each candidate's dataset and read the Critical
   coverage block. Keep the ones that actually show the template well.

Note the tension: for some templates the best-tagged cities cluster in one region.
Balance "best data" against geographic/community diversity per template; record the
choice in `demonstrators:` with a short qualitative `note` (no percentages — they
drift).

### 5. Seed / feature decision (Overpass budget)

Every persisted dataset is a standing daily-refresh cost: the refresh cron
(`api/tasks/update-datasets`) re-fetches **all active datasets**, featured or not,
oldest-first at a small batch size. So seeding is deliberate, not automatic —
demonstrators are recommendations. To showcase one, a signed-in agent/admin opens its
dataset page (which persists it); an admin may then feature the single best via the
dataset-page toggle. Keep the total active/featured set bounded.

### 6. Ship

Commit `templates.yml`, `templates.i18n.yml`, and any `messages/*.json`. Do not open a
PR or push until the maintainer says so. On merge, deploy runs `db:sync`; templates
removed from the YAML soft-deprecate (30 days) then delete.

## Worked examples

- **bus-stops** — tags sit on the node, so `shelter`/`bench`/`lit`/`tactile_paving` are
  well-covered binaries. Dropped `covered` (near-absent), added `operator`.
- **bicycle-rental** — `[bicycle_rental, operator, network, capacity]`. Skewed (one
  bike-share system per city) but kept: the outliers are worth surfacing.
- **tram-stops — rejected.** `railway=tram_stop` marks the trackside point; amenities
  live on the separate `public_transport=platform` node, so the queried node has nothing
  to filter. Check the interesting tags sit on the queried element, not a sibling.

## Validation the sync enforces

`prisma/lib/template-parser.ts` fails `pnpm db:sync`/CI on: unknown parent id, unknown
template id under `filterableTags`/`demonstrators`, and malformed demonstrator entries
(missing/non-integer `area`, non-string `note`). Unit tests:
`prisma/lib/__tests__/template-parser.test.ts`.
