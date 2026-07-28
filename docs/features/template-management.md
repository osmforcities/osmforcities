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

Also check a few megacities (NYC, London, Tokyo, São Paulo) even without a strong
community-strength signal — municipal open-data imports (giveaway tags: `source`,
`source_ref`, `note:<lang>`) can make them the largest sample by an order of magnitude,
which is worth more than a mid-size city with cleaner-looking percentages. But check
the other direction too: a huge population is no guarantee of coverage — cities with
weak local OSM communities (checked Lagos, Addis Ababa for this domain) can come back
essentially empty (1-27 features, 0% on every filterableTag) despite being major world
cities. That's a coverage gap to note, not a reason to doubt the template.

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
- **senior-centers — selector was broken, fixed.** The original query,
  `amenity=senior centre`, had zero uses on taginfo (not a real OSM tag; the space in the
  value is a giveaway of hand-typed guesswork, not a wiki-documented key). The real
  tagging is `social_facility:for=senior` (71K+ global uses) on an `amenity=social_facility`
  node, so the selector became `amenity=social_facility&social_facility:for=senior` and the
  template was made a sub-template of `social-facility` (its query is a strict subset).
  Audit every existing selector against taginfo/wiki before tuning its filterableTags —
  a template can look fine in the YAML and still query nothing in the real world.
- **social-facility** — `[social_facility, social_facility:for, operator, wheelchair]`.
  `social_facility` (the type: nursing_home/day_care/shelter/food_bank/...) and
  `social_facility:for` (who it serves) are the two wiki-documented keys and dominate
  coverage (69-99.7% and 30-72% across 4 cities). Dropped `operator:type` (3-11%
  everywhere — near-absent, not just regionally skewed).
- **senior-centers** — `[social_facility, operator, wheelchair]`. Same `social_facility`
  key still varies meaningfully within the senior-only subset (nursing_home vs day_care vs
  assisted_living). `social_facility:for` is excluded even though wiki-relevant: as the
  sub-template's own query condition it is constant (`senior`) for every feature, so it
  would render as a single-color flat legend. Dropped `operator:type` (0-28%, weakest of
  the four candidates in every sampled city).
- **community-centre** — `[community_centre, operator]`. Thin list: `community_centre:for`
  (2-19%), `wheelchair` (2-32%, near-zero in 3 of 4 cities) and `fee` (0% everywhere) were
  all dropped as near-absent. Only the centre's own type and its operator cleared the bar.
- **town-halls** — `[building, wheelchair, townhall:type]`. `building` (townhall vs civic
  vs yes) is well-covered everywhere (38-100%). `wheelchair` is genuinely regional — strong
  in Europe (84-100%), absent in the Rio/Cape Town sample (0%) — kept per the
  crossings precedent. `townhall:type` (UK-documented but picked up elsewhere: 36% Cape
  Town, 95% Paris) encodes administrative level and was added after showing up unprompted
  in "Most used tags". Dropped `operator` — for a town hall it is near-tautological (the
  municipality itself) and inconsistent (0-63%).

## Validation the sync enforces

`prisma/lib/template-parser.ts` fails `pnpm db:sync`/CI on: unknown parent id, and a
`demonstrators` section that is malformed (scalar/array root, unknown template id, an
`area` that is not a positive integer, non-string `note`). An unknown template id under
`filterableTags` is a non-blocking **warning**, not an error — a typo there only leaves
that one template age-view-only, so it never blocks the seed/deploy. Tests:
`prisma/lib/__tests__/template-parser.test.ts`.
