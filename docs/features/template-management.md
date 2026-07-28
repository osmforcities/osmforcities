# Template Management

How a template gets proposed, defined, validated against real cities, and shipped.
Written to be run by a coding agent end to end.

Templates live in `prisma/templates.yml` (logic) + `prisma/templates.i18n.yml`
(translations), synced to the DB by `prisma/sync-templates.ts` (`pnpm db:sync`). The
YAML is the source of truth; deploy runs the sync. No admin UI.

## Definitions

- **Template** — an OSM selector (`highway=bus_stop`) plus category, icon, optional
  parent, and optional `filterableTags`. Row: `[id, query, category, icon?, parent?]`.
  Query syntax: `;` = OR, `&` = AND, `*`/empty = wildcard; `{OSM_RELATION_ID}` is
  substituted per area at fetch time.
- **Sub-template** — a template with a `parent`. Use when the query is a strict subset
  of a broader template (`bus-stops` under `public-transit`). Standalone → top-level.
- **filterableTags** — an allow-list of OSM tag *keys* (top-level `filterableTags:` map)
  that become interactive-legend "Color by" views + the "Critical coverage" stat block.
  Absent → age view only. Each key needs a `TagLabel` in every `messages/*.json`.
- **Demonstrator** — an OSM relation id (top-level `demonstrators:` map) whose real data
  shows the template at its best. Curation only: validated by the sync, never written to
  the DB. The workflow reads it to decide which datasets to inspect/seed.

## The dashboard is the validation tool

No separate preview. A **signed-in** agent opens `/area/{relationId}/dataset/{templateId}`
— the page creates the dataset on view (Overpass snapshot + stats) and renders the real
dashboard. Read numbers live; never copy them into the YAML (they drift as OSM changes).

Prereqs: local dev server, signed in (osmforcities-dev-auth), Overpass tunnel up
(infra-overpass-tunnel). Resolve relation ids from Nominatim.

## Workflow

1. **Propose** — a template is worth adding when it maps a distinct civic need, has a
   clean wiki-documented selector, and is neither so broad it trips the size cap nor so
   rare it is empty in most cities.
2. **Define** — add the row, pick a seeded `category`, decide parent, add a Lucide `icon`
   (validated by `pnpm generate-icons`), add name/description to `templates.i18n.yml`.
   `pnpm db:sync`.
3. **Choose `filterableTags`** — see below.
4. **Pick demonstrators** — see below.
5. **Seed / feature** — see Overpass budget below.
6. **Ship** — commit `templates.yml`, `templates.i18n.yml`, `messages/*.json`. Don't push
   or open a PR until the maintainer says so. On merge, deploy runs `db:sync`; removed
   templates soft-deprecate (30 days) then delete.

### Tuning `filterableTags` from the dashboard

Start from the OSM wiki page for the selector — it names the tags that describe the
feature's real-world usability (for `amenity=charging_station`: capacity, connector,
access, operator, fee). Shortlist those, then keep a key only if it is **both** well
covered on the dashboard (a meaningful share of features carry it) **and** not the same
value on every feature (or coloring is one flat blob), **and** exists as a single
colorable key. Drop a key when near-absent (`covered` on bus-stops), truly single-valued
everywhere (`public_transport=platform`, PTv2-co-tagged on every stop), not
wiki-relevant, or fragmented across many keys (EV connectors live in count-valued
`socket:type2`/`socket:type2_combo`/… with no single key to color by).

Coverage never qualifies a key on its own — a well-covered `ref` or `name` is still just
a unique code, not a filter. Confirm every candidate against the OSM wiki first. If this
measurement is delegated to a subagent, the subagent must do the wiki cross-check too
(usability-relevance per key), not report Overpass/dashboard coverage alone.

A *skewed* distribution is fine and valuable: `operator` on `bicycle-rental` is mostly
one value (a city has one bike-share system), but the stray outliers it surfaces — a
second operator, a mis-tagged dock — are exactly the deviations OSM for Cities exists to
flag. Don't require an even spread.

Tune both ways, using the dashboard's "Most used tags" as the menu: **reduce**
near-zero keys; **widen** a high-usage varied key (coverage can be regional — the legend
handles Missing). For each key added, add a `TagLabel` in en/es/pt-BR; values fall back
to the raw string, so `TagValue` labels are optional. Re-sync and reload to confirm.

### Picking demonstrators

Up to ~5 cities with strong, well-maintained tagging. Two signals, in order:

1. **Community strength** — shortlist cities in active OSM communities. Proxy: current
   Pascal Neis country stats (`https://osmstats.neis-one.org/?item=countries`).
2. **Dashboard confirmation** — open each candidate and read the Critical coverage block;
   keep the ones that actually show the template well.

Best-tagged cities sometimes cluster in one region — balance best-data against
geographic diversity. Record each in `demonstrators:` with a short qualitative `note`
(no percentages — they drift).

### Seed / feature (Overpass budget)

Every persisted dataset is a standing daily-refresh cost: the cron
(`api/tasks/update-datasets`) re-fetches **all active datasets**, featured or not,
oldest-first at a small batch size. Seeding is deliberate — demonstrators are
recommendations. To showcase one, a signed-in agent/admin opens its dataset page (which
persists it); an admin may feature the single best via the dataset-page toggle. Keep the
active/featured set bounded.

## Worked examples

- **bus-stops** — tags sit on the node, so `shelter`/`bench`/`lit`/`tactile_paving` are
  well-covered binaries. Dropped `covered` (near-absent), added `operator`.
- **bicycle-rental** — `[bicycle_rental, operator, network, capacity]`. Skewed (one
  system per city) but kept: the outliers are worth surfacing.
- **ev-charging** — `[capacity, operator, access, fee]`: the wiki's usability-critical
  keys that each exist as one colorable key. Dropped `network` (wiki doesn't emphasize
  it; ~0% outside Germany). Excluded connectors though the wiki calls them essential —
  OSM fragments them across count-valued `socket:*` keys, so no single key colors "type".
- **crossings** — `[crossing, crossing:markings, tactile_paving]`. Both `crossing`
  (classic) and `crossing:markings` (newer split) are kept — communities favor one or the
  other, so coverage is regional. Dropped `kerb` (6-15% in most cities; it belongs on the
  separate sidewalk `barrier=kerb` node, not the crossing — same sibling-node trap).
- **railway-stations** — `[station, wheelchair, operator, network]`; the mode and
  accessibility tags sit on the station node itself. Dropped `public_transport` (=station
  everywhere, single-valued) and the `train`/`subway`/`light_rail` boolean siblings (mode
  is already in `station=`); excluded `ref`/`name` (unique codes/labels, not categories).
- **tram-stops — rejected.** `railway=tram_stop` marks the trackside point; amenities
  live on the separate `public_transport=platform` node, so the queried node has nothing
  to filter. Check the interesting tags sit on the queried element, not a sibling.
- **public-toilets** — `[access, fee, wheelchair, changing_table, toilets:disposal]`.
  All wiki-documented usability keys with real coverage (30-90% across Paris/Munich/
  Rennes) and value spread. `toilets:disposal` (flush/pitlatrine/chemical) is a single
  colorable sanitation-type key, unlike EV connectors. Dropped `toilets:wheelchair`
  (redundant with `wheelchair`) and `level` (floor number, not a usability category).
- **benches** — `[backrest, material]`. `backrest` is near-universal (66-94%) across
  Paris/Munich/Rennes/Montreal/Taipei; `material` a consistent second tier (14-51%).
  Wiki calls `armrest` and `wheelchair` core too, but both stayed under 22% everywhere
  checked — dropped on coverage, not relevance.
- **drinking-water** — `[man_made, operator, bottle]`. `man_made` (water_tap/fountain/
  water_well subtype) is the most consistent key (46-51% across 3 cities); `operator`
  and `bottle` are regionally strong (Taipei 66%/Utrecht 86%, similar to the crossings
  regional-key pattern) but weak in Munich. Dropped `fee` (near-universal "no", flat)
  and `access`/`indoor`/`wheelchair` (never surfaced above the metadata noise floor —
  `description`/`opening_hours`/`source`/`ref` dominate the raw "most used tags" list
  and must be screened out as non-categorical before trusting the menu).
- **post-offices** — `[operator, brand, wheelchair]`. `operator` (43-95%) and `brand`
  (Rio 60%, franchise vs. state-carrier diversity) both wiki-relevant. `wheelchair`
  reached 93% in Paris and 54% in Munich — high enough to keep despite general
  amenity-accessibility tags being easy to dismiss as boilerplate. Dropped `atm`
  (near-flat "yes") and `opening_hours`/`ref:FR:*` (schedule/code, not categories).
- **parcel-lockers** — `[brand, operator]`. Both 76-99% across Wroclaw/Munich/Paris
  with genuine brand diversity (InPost/DHL/DPD). Dropped `wheelchair` (9-28%, too low
  and inconsistent) and `parcel_mail_in`/`parcel_pickup`/`opening_hours` (near-flat
  "yes"/"24/7").
- **recycling** — `[recycling_type, operator]`. `recycling_type` is near-universal
  (97-100%) with real container/centre variety. `operator` sits at 18-30% but is the
  only other wiki-relevant, non-fragmented key. Dropped every `recycling:*` material
  boolean (glass_bottles, paper, plastic, …) — fragmented across dozens of sibling
  keys, the same trap as EV `socket:*`. Dropped `location` (underground/overground):
  looked promising in the frontload pass but direct dashboard checks across 3 cities
  never exceeded 14% — a reminder that Overpass-only frontloading needs a dashboard
  spot-check before it's trusted, not just a wiki cross-reference. Dropped `capacity`
  (numeric, Barcelona-only outlier).
- **waste-disposal, telephones, internet-access — screen-and-skip.** All three have
  real feature counts (waste-disposal 190-479, telephones 34-335, though
  internet-access is 0-4 everywhere and its own wiki page flags `amenity=internet` as
  a documented tagging mistake — usage is normally `internet_access=*` as an attribute
  on cafes/libraries, not a standalone node). Every wiki-relevant key on all three is
  either near-flat (telephones' `operator` is 197/198 one value in Rio; waste-disposal's
  `access` is 97% "private" in Munich) or below a "meaningful share" floor (waste-
  disposal's `waste` key tops out at 26%). Age-view only; a valid, confirmed outcome
  per the epic's screen-and-skip rule, not a gap to fill later.

## Validation the sync enforces

`prisma/lib/template-parser.ts` fails `pnpm db:sync`/CI on: unknown parent id, and a
`demonstrators` section that is malformed (scalar/array root, unknown template id,
missing/non-integer `area`, non-string `note`). An unknown template id under
`filterableTags` is a non-blocking **warning**, not an error — a typo there only leaves
that one template age-view-only, so it never blocks the seed/deploy. Tests:
`prisma/lib/__tests__/template-parser.test.ts`.
