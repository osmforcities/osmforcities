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
- **Parent (umbrella)** — a template whose query is the union of its children, giving a
  combined dataset plus hierarchy grouping. Only worth it when the children form **one
  coherent thing a user would pull as a whole**, ideally sharing a tag vocabulary —
  `public-transit` (every passenger interface, shared accessibility tags) earns it. Do
  **not** wrap unlike things: an umbrella over bike parking + bike-share + a retail bike
  shop has no shared "Color by" and its combined dataset is an age-view blob, so those
  belong as top-level templates in their own categories. An umbrella is also a standing
  daily-refresh cost if seeded — add one only when the combined view has real value.
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
access, operator, fee). **Wiki-relevance is the gate, not coverage.** Keep a candidate key
when the wiki treats it as describing the feature's usability, quality, or accessibility,
it exists as a single colorable key, and it is not the same value on every feature.
**Low or regional coverage is never on its own a reason to drop a wiki-endorsed key** — the
legend renders Missing, and the handful of features that do carry it are exactly the
deviations and gaps OSM for Cities exists to surface (a taxi rank's `capacity` mapped in
one German city; a ferry `network` present in only a couple of cities). Drop a key only for a *structural*
reason: not wiki-relevant, a unique code/label (`ref`, `name`), truly single-valued
everywhere (`public_transport=platform` co-tagged on every stop; `network`/`operator` =
one authority per city), fragmented across many keys with no single key to color by (EV
connectors live in count-valued `socket:type2`/`socket:type2_combo`/…), or data that lives
on a sibling node, not the queried element.

Coverage cuts neither way by itself: a well-covered `ref` or `name` is still a unique code,
not a filter, while a sparsely-covered but wiki-relevant key earns its place. The wiki
cross-check — usability/quality/accessibility relevance per key — is the decision. If this
is delegated to a subagent, the subagent must do the wiki cross-check too, not report
Overpass/dashboard coverage alone.

A *skewed* distribution is fine and valuable: `operator` on `bicycle-rental` is mostly
one value (a city has one bike-share system), but the stray outliers it surfaces — a
second operator, a mis-tagged dock — are exactly the deviations OSM for Cities exists to
flag. Don't require an even spread, and don't require high coverage either.

Tune using the dashboard's "Most used tags" plus the wiki: **add** any wiki-relevant,
single-key, non-single-valued tag even when sparse; **drop** only unique codes, keys that
are single-valued everywhere, off-wiki keys, and sibling-node keys. Coverage guides which
cities make good demonstrators, not which keys make the list. For each key added, add a
`TagLabel` in en/es/pt-BR; values fall back to the raw string, so `TagValue` labels are
optional. Re-sync and reload to confirm.

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
  well-covered binaries. Dropped `covered` — for a stop the dedicated-shelter question is
  `shelter`; `covered` is a structural roofing key (its wiki home is rain-protected
  `bicycle-parking`), so it is redundant here. Added `operator`.
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
- **transit-platforms** — `[tactile_paving, wheelchair, shelter, bench, lit]`, the wiki's
  platform accessibility/comfort tags. Multimodal (`public_transport=platform` covers bus,
  tram, train, subway) and multi-geometry (nodes/ways/areas), so it is the network-wide
  accessibility lens the trackside `tram-stops` node can't be. `tactile_paving` splits ~50/50
  in Munich; `wheelchair` is a yes/limited/no ternary. Dropped `covered` — for a stop the
  weather-protection question is `shelter` (already listed); `covered` is a structural roofing
  key the wiki reserves for things *under* a roof (its real home is `bicycle-parking`). Also
  dropped `operator`/`network` (MVV = one authority per city, single-valued) and platform
  *mode* (bus/tram/train/subway live in separate boolean keys — no single key to color a
  "type" view). Child of `public-transit`; the parent query was widened to include
  `public_transport=platform` so the umbrella covers every interface and the child stays a
  strict subset.
- **subway-entrances** — `[wheelchair]`. A single key, but `railway=subway_entrance` carries
  wheelchair on ~99% of entrances in Munich / ~83% in Barcelona, well split no/yes/limited —
  the clearest accessibility lens for a metro network. `ref`/`name` excluded (unique codes).
- **taxi-ranks** — `[capacity, operator, wheelchair]`. `capacity` is well covered in German
  cities (Munich 65%, Berlin 41%) and sparse elsewhere — regional, kept. `operator` is a
  single firm in most cities but genuinely multi-valued in London's minicab market, so it
  survives (the deviation lens). Dropped `network` (0% in every city checked — no data to color).
- **ferry-terminals** — `[operator, network, wheelchair]`. Sparse template, but `operator` and
  `network` are genuinely multi-valued in ferry cities (Stockholm SL/Waxholmsbolaget/Stromma;
  Oslo several fjord lines) — not the one-authority-per-city case, so both stay. Amsterdam even
  surfaces a `GVB` vs `Gemeentelijk Vervoerbedrijf` spelling duplicate. `wheelchair` ~48% in Oslo.
- **parking** — `[parking, access, fee, capacity, surface]`, all wiki-canonical parking-quality
  keys. `parking` (surface/underground/multi-storey/street_side/…) and `access`
  (private/customers/permissive/…) are the strongest color-bys (80-94% in Freiburg). Screen on a
  smaller city — `amenity=parking_space` explodes the feature count in big cities and can trip
  the size cap.
- **tram-stops — filterable tags rejected.** `railway=tram_stop` marks the trackside point;
  the passenger amenities live on the separate `public_transport=platform` node (now its own
  `transit-platforms` template), so the queried tram_stop node has nothing to filter — kept as
  an age-view-only dataset. Check the interesting tags sit on the queried element, not a sibling.

## Validation the sync enforces

`prisma/lib/template-parser.ts` fails `pnpm db:sync`/CI on: unknown parent id, and a
`demonstrators` section that is malformed (scalar/array root, unknown template id, an
`area` that is not a positive integer, non-string `note`). An unknown template id under
`filterableTags` is a non-blocking **warning**, not an error — a typo there only leaves
that one template age-view-only, so it never blocks the seed/deploy. Tests:
`prisma/lib/__tests__/template-parser.test.ts`.
