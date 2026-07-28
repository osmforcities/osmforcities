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
- **hospitals** — `[operator:type, emergency, wheelchair, operator]`. New trap:
  `healthcare=hospital` duplicates `amenity=hospital` everywhere (single-valued, not a
  filter) — same shape as `railway-stations`' `public_transport` drop. Dropped
  `healthcare:speciality` too: multi-value semicolon strings fragment into a long tail of
  near-unique combinations here (unlike doctors/clinics, see below). Dropped
  `ref:FR:FINESS`/`type:FR:FINESS` — well covered but France-only opaque registry codes.
- **clinics** — `[healthcare:speciality, operator:type, wheelchair, operator]`. Kept
  `healthcare:speciality` here (and for doctors): despite the same multi-value shape as
  hospitals, the single-value buckets (`psychiatry`, `paediatrics`,
  `traditional_chinese_medicine`...) are clean and well-populated — it's the primary
  civic-classification signal the wiki documents this key for. Judgment call, not a
  mechanical rule: check the actual value distribution, don't just pattern-match on key
  name.
- **doctors** — `[healthcare:speciality, wheelchair]`. New trap: `operator` here is a
  solo practitioner's name (e.g. "Dr. med. Frederic Hollay"), functionally identical to
  `name` — not a network/operator classification. Same trap hit dentists and veterinary.
  Dropped `operator`/`operator:type` for all three.
- **dentists** — `[wheelchair]` only. `healthcare:speciality` coverage was too thin
  (~16%) and its top value ("dentist") just repeats the amenity itself.
- **pharmacies** — `[dispensing, wheelchair]`. New trap: `brand` (chain name) is clean
  and wiki-relevant where present (Pacheco/Droga Raia in Brazil, similar in South Africa)
  but ~0% in Germany's independent-pharmacy market — same single-market-skew that
  dropped ev-charging's `network`. Dropped despite being wiki-documented.
- **health-post — screen-and-skip.** `amenity=health_post` is globally rare: 0 results
  in 4 of 6 tested cities across 4 continents. Where present (Manila, thin sample),
  `healthcare=*` genuinely varies (`community_health_worker`/`health_aide`/`centre`) —
  confirming it is *not* always a duplicate of `amenity` (contrast with hospitals above);
  it just wasn't well-populated enough here to filter on. Age view only.
- **nursing-home — screen-and-skip.** `amenity=nursing_home` is wiki-flagged deprecated
  in favor of `amenity=social_facility` + `social_facility=nursing_home`; live data
  confirms near-total migration away from it (single digits per city, 0 in Paris).
  Updating the base query to the newer tag is a separate follow-up, out of scope for a
  filterableTags-only pass. Age view only.
- **veterinary** — `[wheelchair]` only. `emergency` was a plausible wiki-adjacent
  hypothesis but tested at 0% everywhere — a reminder that "wiki-documented" is necessary
  but not sufficient; always confirm against real coverage before keeping a key.
- **New templates added mid-batch: opticians, medical-laboratories, psychotherapists,
  physiotherapists.** All 8 original healthcare templates query `amenity=*`, but the
  wiki documents 23 `healthcare=*` values meant to be used *standalone* with no
  `amenity` tag at all (physiotherapist, psychotherapist, laboratory, rehabilitation,
  blood_donation, dialysis, hospice, optometrist...) — an entire class of allied-health
  facilities invisible to an amenity-only template set. Added the four with clear
  civic value and real coverage; left the rest (mostly niche or unverified) for a
  future pass. `shop=optician` doesn't use `healthcare=*` at all — different key,
  same "wiki-documented but missing" gap.
  - **opticians** (`shop=optician`) — `[wheelchair, brand]`. Same trap as pharmacies:
    `operator` is an individual owner's name where opticians are independent
    (Germany), so dropped; `brand` is the real chain signal (Apollo-Optik, Fielmann,
    Oticas Carol, 寶島眼鏡) and, unlike pharmacies' `brand`, has decent coverage in
    every city tested, not just chain-heavy markets.
  - **medical-laboratories** (`healthcare=laboratory`) — `[healthcare:speciality,
    wheelchair, operator]`. Kept `healthcare:speciality` despite 80%+ of Paris labs
    being the single value `biology` — the minority `radiology`/other buckets are a
    real, civically useful distinction (where to get an X-ray vs a blood test), same
    judgment call as `dispensing` on pharmacies. Data is heavily France-skewed (171 in
    Paris vs 6 in Munich, 33 in Rio) — real global unevenness, not a France-only tag,
    but only Paris cleared the coverage bar for a demonstrator.
  - **psychotherapists** / **physiotherapists** (`healthcare=psychotherapist` /
    `healthcare=physiotherapist`) — `[wheelchair]` only for both. Same solo-
    practitioner `operator` trap as doctors/dentists/veterinary. Dropped
    `healthcare:speciality` too: low coverage (14-29%) and top value is redundant
    with the template's own tag (e.g. `psychotherapist` on a psychotherapist). Both
    tags are Europe-heavy in practice — Taipei and Rio came back with 3-6 features for
    physiotherapists (other cities likely fold this into `amenity=clinic` +
    `healthcare:speciality=physiotherapy` instead, per the clinics entry above), so
    physiotherapists shipped with a single demonstrator city.

## Validation the sync enforces

`prisma/lib/template-parser.ts` fails `pnpm db:sync`/CI on: unknown parent id, and a
`demonstrators` section that is malformed (scalar/array root, unknown template id,
missing/non-integer `area`, non-string `note`). An unknown template id under
`filterableTags` is a non-blocking **warning**, not an error — a typo there only leaves
that one template age-view-only, so it never blocks the seed/deploy. Tests:
`prisma/lib/__tests__/template-parser.test.ts`.
