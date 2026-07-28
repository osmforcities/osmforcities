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

Shortlist from the OSM wiki page for the selector — it names the tags that describe the
feature's real-world usability (for `amenity=charging_station`: capacity, connector,
access, operator, fee). Then decide per key:

**Keep** a key only when all three hold:

- **Wiki-relevant** — describes usability/equity, not identity. Coverage never qualifies
  a key on its own: a well-covered `ref` or `name` is a unique code, not a filter.
- **Colorable** — exists as one single key. Not fragmented across siblings (EV connectors
  live in count-valued `socket:type2`/`socket:type2_combo`/… — no single key to color by).
- **Well-covered with variance** — a meaningful share of features carry it, and not the
  same value on every one (or coloring is one flat blob).

**Drop** a key when:

- **Near-absent** — `covered` on bus-stops.
- **Single-valued everywhere** — `public_transport=platform`, PTv2-co-tagged on every stop.
- **Not wiki-relevant** — `ref`, `name`.
- **Fragmented** across many keys (see EV connectors above).

**Exceptions to the rules:**

- **Wiki-essential equity/usability keys** (`capacity`, `wheelchair`) stay even when
  near-absent — a large Missing share is the signal, not a reason to hide the filter.
  Use wiki-importance and common sense, not the coverage number alone.
- **Skewed is fine.** `operator` on `bicycle-rental` is mostly one value (one bike-share
  system per city), but the stray outliers — a second operator, a mis-tagged dock — are
  exactly the deviations OSM for Cities exists to flag. Don't require an even spread.

Tune both ways off the dashboard's "Most used tags" menu: **reduce** near-zero keys,
**widen** a high-usage varied key (coverage can be regional — the legend handles Missing).
For each key added: add a `TagLabel` in en/es/pt-BR (values fall back to the raw string,
so `TagValue` labels are optional), re-sync, reload to confirm. If measurement is
delegated to a subagent, it must do the wiki cross-check too — not report coverage alone.

Don't translate values that are standardized indexes or codes (`isced:level` = ISCED
levels 0-8, `capacity` counts): leave them raw, no `TagValue` map. The code is the
canonical form and its ordering is meaningful; a localized word list would only obscure
it. Only add `TagValue` labels for keys whose values are opaque enum strings (`wlan`,
`government`).

### Accessibility as a transversal signal

- **`wheelchair`** — always shortlist **and keep** for any enterable-building /
  staffed-amenity template (shops, healthcare, education, government, culture, tourism,
  food, transit). Low coverage is not a reason to drop it (equity-essential exception
  above).
- **Skip `wheelchair`** only when there's nothing to enter: outdoor/natural features,
  street furniture, `parking` (use `capacity:disabled` instead), unstaffed infra
  (`bicycle-parking`, `bicycle-rental`, `taxi-ranks`).
- **Blind/visually-impaired tags** (`tactile_paving`, `kerb`, `traffic_signals:sound`/
  `:vibration`) are a separate, narrower track — pedestrian-path templates only
  (crossings, bus-stops, platforms, subway-entrances; see Worked examples). Don't add
  them to a POI template just because `wheelchair` applies there.

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
- **kindergarten / childcare / music-school / language-school / research-institute** —
  `wheelchair` added to all five despite low coverage (0-31% across demonstrator
  cities, several samples under 20 features): it's an equity-essential key per the
  wiki, so the near-absent rule doesn't apply — the Missing share is itself useful.
- **tram-stops — rejected.** `railway=tram_stop` marks the trackside point; amenities
  live on the separate `public_transport=platform` node, so the queried node has nothing
  to filter. Check the interesting tags sit on the queried element, not a sibling.
- **restaurants** — `[cuisine, wheelchair, outdoor_seating, takeaway, delivery,
  diet:vegetarian]`. `takeaway`/`delivery` swing hard by region (2-9% in Paris vs
  26-29% in Wrocław) but are kept — both real, both wiki-core, coverage is regional.
  Dropped `smoking`/`internet_access`/`reservation`/`capacity` (all under 15% and
  inconsistent across three regions).
- **cafes** — `[cuisine, outdoor_seating, indoor_seating, wheelchair, takeaway,
  internet_access]`. `indoor_seating` wasn't an initial wiki-fetch candidate — it
  surfaced unprompted in "Most used tags" at 37-42% in Paris; the wiki does document it
  as the seating-type counterpart to `outdoor_seating`, so it was added and kept (14-37%
  in Europe, near-zero in Mexico City — regional, same as `crossing:markings`).
- **fast-food** — `[cuisine, takeaway, outdoor_seating, wheelchair, delivery]`. Dropped
  `drive_through` despite wiki emphasis: 2-5% across Paris/Wrocław/Mexico City (car-heavy
  Mexico City included) — structurally rare at dense urban scale, not a regional pocket.
- **bars** — `[wheelchair, outdoor_seating, smoking]`. Dropped `live_music`/`microbrewery`
  (0-1% in all three test regions despite wiki "useful combination" billing — an event
  attribute and a rare specialty, not stable physical facts to color by).
- **pubs** — `[wheelchair, outdoor_seating, smoking, internet_access, real_ale, food]`.
  `food`/`real_ale`/`microbrewery`/`live_music` looked near-zero (0-8%) in Paris/Wrocław,
  small-city data that doesn't reflect pub culture. Re-tested at scale against Greater
  London (3.2k pubs, the pub-culture heartland): `real_ale` (15%) and `food` (19%) both
  clear the bar already accepted for `smoking` (10%) and `internet_access` (9%) — added.
  `microbrewery` (3%) and `live_music` (<1%) stayed thin even in London — dropped. Also
  excluded `wheelchair` from the candidate list only by oversight in the pub wiki page
  itself — the generic `Key:wheelchair` page treats it as universal, and dashboard data
  confirmed 25-49%.
- **ice-cream** — `[wheelchair, outdoor_seating, takeaway]`. Small dataset everywhere
  (80-227 features per city) but the three keys are consistently present (4-48%);
  dropped `self_service` (0% in all three cities tested).
- **food-court — screen-and-skip.** `amenity=food_court` is genuinely thin: 6-27 features
  across Paris/Wrocław/Barcelona/Mexico City. `wheelchair` showed 40-57% in three of four
  cities but on raw samples of 3-7 features — too small to trust as a legend. No
  filterableTags added (age view only); no demonstrators picked, since no city shows the
  template distinctly well. Revisit if OSM coverage of food courts grows.
- **food-vending** — `[vending, operator, brand]`. `vending` is baked into the query
  itself (100% coverage everywhere) and is the payoff key: in Tokyo it splits 6.4k
  machines into drinks (6,244) vs coffee/food/ice_cream/milk/sweets/water (3-63 each) —
  a heavily skewed but genuinely useful "Type" view, same pattern as `bicycle-rental`'s
  `operator`. `operator`/`brand` are regional (9-78% / 5-69% across Tokyo/Paris/Wrocław)
  but real in at least one strong city each. Dropped `wheelchair` (0-2% everywhere; also a
  poor conceptual fit — accessibility isn't a meaningful attribute for a vending machine).
- **canteens — rejected.** `amenity=canteen` returned zero features in 5 of 6 test cities
  (Paris, Wrocław, Barcelona, Mexico City, Tokyo); only Munich had any data (16 features).
  Even there, `access` (the key that would carry a students-vs-employees food-security
  signal) only showed `private`/Missing — no city demonstrated the school-canteen use
  case the tag is meant to capture. Empty in most cities fails the propose bar outright;
  not added. Revisit if OSM coverage grows, or if a country-specific school-meal tagging
  convention turns up (e.g. Brazil's merenda escolar, mapped some other way).

## Validation the sync enforces

`prisma/lib/template-parser.ts` (tests: `prisma/lib/__tests__/template-parser.test.ts`).

**Fails** `pnpm db:sync`/CI on:

- Unknown parent id.
- Malformed `demonstrators` — scalar/array root, unknown template id, `area` that is not
  a positive integer, non-string `note`.

**Warns** (non-blocking):

- Unknown template id under `filterableTags` — a typo there only leaves that one template
  age-view-only, so it never blocks the seed/deploy.
