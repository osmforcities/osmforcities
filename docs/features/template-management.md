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
- **Sibling-node** — the data lives on a different element than the queried one (`kerb`
  on the sidewalk node, not the crossing).

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
`government`, `parking`, `surface`).

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
  well-covered binaries. Dropped `covered` — for a stop the dedicated-shelter question is
  `shelter`; `covered` is a structural roofing key (its wiki home is rain-protected
  `bicycle-parking`), so it is redundant here. Added `operator` and `wheelchair` (boarding
  accessibility — yes/limited/no, ~51% Munich / ~83% Rennes).
- **bicycle-rental** — `[bicycle_rental, operator, network, capacity]`. Skewed (one
  system per city) but kept: the outliers are worth surfacing.
- **ev-charging** — `[capacity, operator, access, fee]`: the wiki's usability-critical
  keys that each exist as one colorable key. Dropped `network` (wiki doesn't emphasize
  it; ~0% outside Germany). Excluded connectors though the wiki calls them essential —
  OSM fragments them across count-valued `socket:*` keys, so no single key colors "type".
- **crossings** — `[crossing, crossing:markings, tactile_paving, traffic_signals:sound]`.
  Both `crossing` (classic) and `crossing:markings` (newer split) are kept — communities
  favor one or the other, so coverage is regional. `traffic_signals:sound` is the acoustic
  visually-impaired signal (yes/no/locate/walk) — ~26% of all crossings but ~94% of the
  signalized subset, well varied; its tactile companion `traffic_signals:vibration` is an
  available add. Dropped `kerb` (6-15% in most cities; it belongs on the separate sidewalk
  `barrier=kerb` node, not the crossing — same sibling-node trap).
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
- **taxi-ranks** — `[capacity, operator]`. `capacity` is well covered in German cities
  (Munich 65%, Berlin 41%) and sparse elsewhere — regional, kept. `operator` is a single
  firm in most cities but genuinely multi-valued in London's minicab market, so it survives
  (the deviation lens). Dropped `network` (0% in every city checked — no data to color) and
  `wheelchair` — a taxi rank is unstaffed street infra with nothing to enter, so it falls
  under the a11y "skip wheelchair" list, not the equity-keep exception.
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
- **kindergarten / childcare / music-school / language-school / research-institute** —
  `wheelchair` added to all five despite low coverage (0-31% across demonstrator
  cities, several samples under 20 features): it's an equity-essential key per the
  wiki, so the near-absent rule doesn't apply — the Missing share is itself useful.

### Linear-network templates (ways)

- **roads** — `[surface, maxspeed, lit, sidewalk]`. All near-universal in well-mapped cities
  (Munich surface 99%, maxspeed 97%, lit 90%, sidewalk 51%). `surface` looks single-valued in a
  European capital (all asphalt) but carries the paved/unpaved signal that matters in the Global
  South — pick at least one demonstrator (e.g. Rio) that shows the variance. Dropped `name`
  (identity, not a filter) and `lanes` (numeric count, poor color-by).
- **footways** — `[surface, lit, smoothness]`. `surface` 72%, `lit` 46%, `smoothness` 25% in
  Munich. Even on a pedestrian path the blind/kerb a11y keys stay off: `tactile_paving` 0.6%,
  `wheelchair` 4%, `incline` 1% — that data lives on the crossing nodes, not the footway ways.
  `surface`/`smoothness` are the accessibility-quality proxies that actually sit on the way.
- **cycleways** — `[surface, lit, oneway, smoothness]`. Strong across cycling cities (Utrecht/
  Munich 59–89%). `segregated`/`width` too sparse to keep.

### Rail and bus additions

- **rail-tracks** — `[railway, electrified, usage, service]`. Query is the union
  `railway=tram;railway=subway;railway=light_rail;railway=rail`, and the discriminating key
  `railway` is the star color-by (tram vs subway vs mainline) — the same pattern as `parking`'s
  `parking` type. `electrified` 91%, `service` 51%, `usage` 33% in Munich. Dropped `gauge`
  (99% present but single-valued — a code, not a filter) and `maxspeed` (numeric). Top-level, not
  a child of `public-transit` (tracks aren't a subset of the stops union).
- **busways** vs **bus-lanes** — two clean templates for one messy reality. BRT is tagged two
  structurally different ways: physically **segregated** corridors as `highway=busway` (separate
  ways — Rio 1185, SP corredores 572) and **on-street** lanes as `busway:*=lane` attributes on the
  road (Bogotá Transmilenio, SP faixas). `busways` = `highway=busway` (`[surface]`); `bus-lanes` =
  `busway=lane;busway:left=lane;busway:right=lane;busway:both=lane`, age-view only because its
  color-by would be fragmented across those sibling keys. Keeping them separate avoids mixing
  separate-way corridors with attributed road geometry in one legend.
- **traffic-calming** — `[traffic_calming]`. The value *is* the type (hump/bump/table/island/dip),
  a textbook color-by. Sparse in Germany (Munich 152) but heavily mapped in Latin America
  (São Paulo 7k+ "lombadas") — demonstrate there.
- **speed-cameras — query fixed.** The template queried `man_made=speed_camera` (≈0 features
  everywhere); the feature is actually tagged `highway=speed_camera` (São Paulo 878). Union both.
  `[maxspeed]` is the enforced-limit color-by, 97% covered. **Lesson: confirm the query tag itself
  matches real features before tuning — a near-empty dataset is often a wrong selector, not a
  missing city.**

Traffic-signs, traffic-lights, bridges and tunnels stay age-view only: sign values are
country-specific codes (not colorable), and the useful bridge/tunnel/acoustic-signal attributes
sit on the sibling road or crossing node, not the queried element.

> Category note: all transport templates live under the single `transport` category (the former
> `transportation` / `transport_infrastructure` / `traffic` split was consolidated — see the
> `categories:` map). Merging categories is YAML-only; emptied categories drop out of the browse
> UI, which lists only categories that have templates.

## Validation the sync enforces

`prisma/lib/template-parser.ts` (tests: `prisma/lib/__tests__/template-parser.test.ts`).

**Fails** `pnpm db:sync`/CI on:

- Unknown parent id.
- Malformed `demonstrators` — scalar/array root, unknown template id, `area` that is not
  a positive integer, non-string `note`.

**Warns** (non-blocking):

- Unknown template id under `filterableTags` — a typo there only leaves that one template
  age-view-only, so it never blocks the seed/deploy.
