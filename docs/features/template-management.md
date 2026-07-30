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

**Candidates come from the selector's OSM wiki page only.** It names the usability tags
(for `amenity=charging_station`: capacity, connector, access, operator, fee). Never invent
a key, and never add a regional-convention key — the AWWA hydrant `colour` scheme, US
`drive_through` — even where locally common. Within the wiki set, decide per key:

**Keep** when all three hold:

- **Wiki-relevant** — describes usability/equity, not identity. `ref`/`name` are codes,
  never filters, no matter how well covered.
- **Colorable** — one single key, not fragmented across siblings (EV connectors live in
  count-valued `socket:type2`/`socket:type2_combo`/… — no single key to color by).
- **Well-covered with variance** — a meaningful share carry it, with more than one value.

**Drop** when: near-absent (`covered` on bus-stops); single-valued everywhere
(`public_transport=platform`); identity (`ref`, `name`); fragmented across keys; or a
**sibling-node** tag — the data sits on a different element than the queried one (`kerb` on
the sidewalk node, not the crossing).

**Exceptions:**

- **Equity/usability keys** (`capacity`, `wheelchair`) stay even when near-absent — the
  Missing share *is* the signal. Wiki-importance and common sense over the coverage number.
- **Skewed is fine** — `operator` on `bicycle-rental` is one value per city, but the stray
  outlier (a second operator, a mis-tagged dock) is exactly what we exist to flag.

Tune both ways off the dashboard's "Most used tags": drop near-zero keys, widen a
high-usage varied one (coverage may be regional — the legend handles Missing). Per key
added: `TagLabel` in en/es/pt-BR, re-sync, reload to confirm. A subagent that measures
must do the wiki cross-check too, not report coverage alone.

Leave standardized codes/indexes raw — no `TagValue` map (`isced:level` 0-8, `admin_level`,
`capacity` counts): the code's ordering is canonical, a word list obscures it. Add
`TagValue` labels only for opaque enum strings (`wlan`, `government`, `parking`, `surface`).

### Accessibility as a transversal signal

- **`wheelchair`** — always shortlist **and keep** for any enterable-building /
  staffed-amenity template (shops, healthcare, education, government, culture, tourism,
  food, transit). Low coverage is not a reason to drop it (equity-essential exception
  above). A curated tag carried by **no** feature (e.g. `wheelchair` at 0% on
  health-post) still renders as a Color-by view — a single all-Missing legend row that
  paints every feature the missing color — so the accessibility gap shows on the map,
  not only in the stats panel.
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
- **pharmacies** — `[dispensing, wheelchair, brand]`. `brand` (chain name) is wiki-
  documented and a clean multi-value categorical in chain markets (NYC: CVS 102 /
  Duane Reade 89 / Walgreens 58 / Rite Aid 32; similar in Brazil/South Africa). It is
  ~0% in Germany's independent-pharmacy market, but that all-Missing legend is itself
  the finding (independent vs chain pharmacy structure), not a reason to drop a wiki
  key — the wiki-over-coverage rule outranks single-market skew here. (Reinstated in
  the #414 re-audit; had been dropped by analogy to ev-charging's `network`.)
- **health-post — near-empty, `[wheelchair]` only.** `amenity=health_post` is globally
  rare: 0 results in 4 of 6 tested cities across 4 continents. Where present (Manila,
  thin sample), `healthcare=*` genuinely varies (`community_health_worker`/
  `health_aide`/`centre`) — confirming it is *not* always a duplicate of `amenity`
  (contrast with hospitals above) — but not well-populated enough to justify its own
  filter. `wheelchair` carried anyway per the exemption above, despite ~0% coverage.
- **nursing-home — near-empty, `[wheelchair]` only.** `amenity=nursing_home` is
  wiki-flagged deprecated in favor of `amenity=social_facility` +
  `social_facility=nursing_home`; live data confirms near-total migration away from it
  (single digits per city, 0 in Paris). Updating the base query to the newer tag is a
  separate follow-up, out of scope for a filterableTags-only pass. `wheelchair` carried
  anyway per the exemption above.
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
    Oticas Carol, 寶島眼鏡) with decent coverage in every city tested, not just
    chain-heavy markets.
  - **medical-laboratories** (`healthcare=laboratory`) — `[healthcare:speciality,
    wheelchair, operator, brand]`. Kept `healthcare:speciality` despite 80%+ of Paris
    labs being the single value `biology` — the minority `radiology`/other buckets are a
    real, civically useful distinction (where to get an X-ray vs a blood test), same
    judgment call as `dispensing` on pharmacies. Data is heavily France-skewed (171 in
    Paris vs 6 in Munich, 33 in Rio) — real global unevenness, not a France-only tag,
    but only Paris cleared the coverage bar for a demonstrator. Added `brand` in the
    #414 re-audit: lab groups are franchised, so `brand` is a clean chain categorical
    (Paris: Biogroup 17 / Bioclinic 12 / Cerballiance 10 / Synlab 5).
  - **psychotherapists** / **physiotherapists** (`healthcare=psychotherapist` /
    `healthcare=physiotherapist`) — `[wheelchair]` only for both. Same solo-
    practitioner `operator` trap as doctors/dentists/veterinary. Dropped
    `healthcare:speciality` too: low coverage (14-29%) and top value is redundant
    with the template's own tag (e.g. `psychotherapist` on a psychotherapist). Both
    tags are Europe-heavy in practice — Taipei and Rio came back with 3-6 features for
    physiotherapists (other cities likely fold this into `amenity=clinic` +
    `healthcare:speciality=physiotherapy` instead, per the clinics entry above), so
    physiotherapists shipped with a single demonstrator city.
- **Demonstrator pool had a blind spot: no North American city.** A full coverage sweep
  of the remaining ~20 standalone `healthcare=*` values across Munich/Paris/Rio/
  Taipei/Cape Town looked thin for several (optometrist 12 total, rehabilitation 14,
  dialysis 5). Adding New York City, Los Angeles, and Madrid to the same sweep changed
  the totals substantially (optometrist 125, rehabilitation 65, dialysis 42) — NYC
  alone carries most of that swing. **A 5-city demonstrator pool without North America
  will systematically undercount US-tagging-convention-heavy values.** Lesson for
  future domain batches: include at least one large US city in the first coverage
  pass, not as an afterthought.
  - Added **podiatrist (79→124), counselling (39→65), speech_therapist (32→52),
    occupational_therapist (21→30)** as new templates on the strength of the corrected
    numbers — all comfortably real, multi-city.
  - Deliberately did **not** add `dialysis` despite a much bigger corrected total (42):
    37 of 42 come from NYC+LA alone, near-zero elsewhere — a single-market skew, same
    disqualifying pattern as ev-charging's `network` in #406. `blood_donation` (29) is
    thinner in total but present in all 8 cities tested, the more honest "real but
    modest" signal — deferred, not added, pending its own coverage pass.
  - Re-checked the 12 already-committed templates against NYC/LA/Madrid via the
    dashboard (not just curl): NYC has 5-10x the raw volume of any other demonstrator
    city for hospitals/clinics/doctors/pharmacies/opticians, but **volume alone isn't
    sufficient** — NYC's wheelchair coverage is consistently weak (2-13%) even where
    its other tags are strong, so it was added as a demonstrator only for
    hospitals/clinics/doctors/pharmacies/opticians/medical-laboratories (where at least
    one kept filterableTag is genuinely strong there), and skipped for
    dentists/veterinary/physiotherapists/psychotherapists (where NYC's coverage on the
    *only* kept filterableTag, wheelchair, is worse than the existing demonstrators).
- **optometrists** (`healthcare=optometrist`) — `[wheelchair]` only, kept solely under
  the exemption above (0-10% coverage everywhere tested). `brand` in its best city (NYC,
  29%) is a single-chain artifact (100% "Cohen's Fashion Optical"), not a generalizable
  signal — dropped.
- **podiatrists** — `[wheelchair]`. Same solo-practitioner `operator` trap. Munich (50%)
  is the only city with usable wheelchair coverage; Paris has 3x the raw count but
  wheelchair coverage under 10%.
- **rehabilitation-centres** (`healthcare=rehabilitation`) — `[operator, wheelchair]`.
  `operator` here is genuinely institutional (Legacy Healing, VillageCare, Jamaica
  Hospital, Ensign Group), not the solo-practitioner trap — worth checking per
  template, not assuming. `wheelchair` is weak everywhere (11-13%) but carried per the
  exemption above.
- **counselling-services** — `[wheelchair, operator]`. Munich only demonstrator (39%
  both); `healthcare:counselling` sub-tag exists but too thin (6 features) to use.
- **speech-therapists** — `[wheelchair]` only, Munich (18%), the weakest coverage kept
  in the batch — shipped anyway since it's the only accessibility-relevant signal and
  matches the bar used for dentists/veterinary.
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
- **Post-merge gap check: `healthcare=hospice` vs `healthcare=alternative`.** Neither
  had been screened in the original batch. `hospice` is a genuine dead end — 1 result
  across all 8 demonstrator cities, rarer than `health-post`; not added. `alternative`
  (complementary/alternative medicine) was a real miss: 282 features across 5 of 8
  cities (NYC 170, LA 51, Taipei 35, Madrid 19, Rio 7), with a clean
  `healthcare:speciality` split (acupuncture, chiropractic, massage, herbalism,
  traditional_chinese_medicine, osteopathy) — stronger coverage than podiatrists or
  speech-therapists, which already shipped. `[healthcare:speciality, wheelchair]`;
  dropped `operator` for the same solo-practitioner trap as doctors/dentists (mostly
  individual names, e.g. "Dr. Gerald Sciascia").
- **Wiki gap re-audit (large cities: NYC / Berlin / Tokyo / London).** A pass over the
  full `Key:healthcare` value list against live coverage in four large, tagging-rich
  cities surfaced three documented `healthcare=*` facility types missing from the set:
  - **blood-donation** (`healthcare=blood_donation`) — `[operator, wheelchair]`, icon
    Droplet. Present in all four cities (Berlin 9, NYC 8, London 6, Tokyo 3); `operator`
    is the blood-service org (DRK, CSL Plasma, Haema, NHS Blood, Red Cross) — a clean
    institutional categorical, not the solo-practitioner name trap.
  - **dialysis-centres** (`healthcare=dialysis`) — `[operator, wheelchair]`, icon
    Droplets. Strong in NYC (29) and Berlin (8), thin/absent in London (2) and Tokyo
    (0 — folded into `amenity=clinic`); the all-Missing legend there is itself the
    finding. `operator` = dialysis chains (DaVita, Fresenius). Critical chronic-care
    infrastructure.
  - **midwives** (`healthcare=midwife`) — `[wheelchair]`, icon Baby. Europe-leaning
    (Berlin 21, NYC 5, London 3, Tokyo 0); `operator` dropped (solo-practitioner name).
  Screened out as too thin or wiki-discouraged: `hospice`, `sample_collection`,
  `audiologist`, `birthing_centre`, `vaccination_centre` (decommissioned), `blood_bank`,
  `nurse`, `medical_imaging`, and the `centre`/`yes` catch-alls.
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
  Query's `vending=*` value list checked against taginfo usage counts (2026-07-28): added
  `eggs` (880 uses, same tier as already-included `milk`/`ice_cream`); `snacks`/`honey`/
  `potatoes`/`meat`/`cheese` (109-265 uses) stay below the threshold used for every other
  value here. Also found and fixed a real query-builder bug: `buildOverpassQuery` matched
  tag values with exact equality, so vending machines using OSM's semicolon-combined-value
  convention (`vending=drinks;food`, `vending=coffee;sweets`, etc — ~4,240 machines
  globally per taginfo) were silently invisible to this template. Fixed generally (not
  special-cased) by switching value matches to a semicolon-boundary regex
  (`"key"~"(^|;)value(;|$)"`); verified against real Overpass for Wrocław that this is a
  strict superset (21 → 29 features, zero of the original 21 lost). No other template's
  query is affected in practice — every other value-matched key in `templates.yml`
  (`amenity`, `natural`, `shop`, `leisure`, `tourism`, `office`, `historic`, `man_made`,
  `building`, `highway`, `railway`, `waterway`) is a primary classification key that OSM
  convention treats as single-valued; only descriptive/attribute keys like `vending=*` are
  routinely semicolon-combined.
- **canteens — rejected.** `amenity=canteen` returned zero features in 5 of 6 test cities
  (Paris, Wrocław, Barcelona, Mexico City, Tokyo); only Munich had any data (16 features).
  Even there, `access` (the key that would carry a students-vs-employees food-security
  signal) only showed `private`/Missing — no city demonstrated the school-canteen use
  case the tag is meant to capture. Empty in most cities fails the propose bar outright;
  not added. Revisit if OSM coverage grows, or if a country-specific school-meal tagging
  convention turns up (e.g. Brazil's merenda escolar, mapped some other way).
- **Domain completeness (2026-07-28).** Checked the food batch against the OSM wiki's
  "Sustenance" amenity group (the canonical list of eating/drinking establishment types):
  bar, biergarten, cafe, fast_food, food_court, ice_cream, pub, restaurant. 7 of 8 are
  covered; `biergarten` is deliberately deferred (see epic #245). No other essential
  template is missing from the domain. Cross-checked for miscategorization too — no
  Sustenance-group amenity is duplicated or filed under a different category, and
  `amenity=marketplace` (the future Markets-domain candidate) isn't defined anywhere yet.
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
- **waste-disposal, telephones — screen-and-skip.** Both have real feature counts
  (waste-disposal 190-479, telephones 34-335) but every wiki-relevant key is either
  near-flat (telephones' `operator` is 197/198 one value in Rio; waste-disposal's
  `access` is 97% "private" in Munich) or below a "meaningful share" floor
  (waste-disposal's `waste` key tops out at 26%). Age-view only; a valid, confirmed
  outcome per the epic's screen-and-skip rule, not a gap to fill later.
- **internet-access — rejected, removed from `templates.yml`.** 0-4 features
  everywhere checked (Paris: 1 feature, 3 years stale). The tag's own OSM wiki page
  flags `amenity=internet` as a documented tagging mistake — real internet access is
  tagged as an attribute (`internet_access=wlan`) on cafes/libraries, not a standalone
  node. Unlike screen-and-skip (real dataset, no color-by), this selector itself
  doesn't map anything real; removed rather than kept as an empty age-view template.
- **waste-basket — added, screen-and-skip.** `amenity=waste_basket` is 1.2M+ features
  globally (taginfo) and was completely absent from `templates.yml` despite being
  near-universal street furniture — the clearest "add" gap found in this domain.
  But real coverage is thin everywhere checked (Munich 7.3k features, `waste` key at
  33%; Paris 5.9k features, `waste` at 18%; Rennes `waste` at 15%): high volume,
  low tag richness. No filterableTags; seeded for volume/coverage stats, not a
  color-by legend. A useful contrast to internet-access: huge dataset, thin tags,
  still worth adding — the Propose bar is about the *feature* mattering, not every
  candidate key panning out.
- **bottle-return — added, single-demonstrator.** `amenity=vending_machine` +
  `vending=bottle_return` (reverse vending / deposit-return machines). Checked 15
  cities including NYC (16 features, all bare — no operator, nothing to filter) and
  10 more European/American cities (0-6 features each, mostly bare or empty:
  Paris/Rio/Montreal/LA/Taipei/Oslo/Copenhagen all 0). Only **Berlin** (15 features)
  showed real tag richness: `operator` names five different supermarket chains
  (Netto, Kaufland, Rewe, Lidl, Studierendenwerk). `filterableTags: [operator]`,
  demonstrators limited to Berlin alone — this is thinner than every other kept
  template in this batch, closer to `ferry-terminals` (sparse, operator-only) than
  to a normal 3-5-demonstrator pick. Worth revisiting if OSM coverage of deposit
  machines improves; don't widen the demonstrator list without re-checking coverage.
- **shower — added, screen-and-skip.** `amenity=shower` is 36k features globally. Real
  and legitimate (Paris's historic "bains-douches" municipal bathhouses, Barcelona's
  beach showers — 56 features) but every wiki key is flat where it has volume:
  Barcelona `access` is 90% "yes", `fee` is 100% "no". Small-N cities (Paris 17,
  Munich 12) don't have enough features to trust a percentage either way. Added for
  coverage/volume, no color-by.
- **public-bookcase — added.** `[public_bookcase:type]`. Coverage is regional
  (Munich 60%, Paris 19%, Berlin 60%) but the value itself is genuinely categorical
  and distinct per city: Munich favors `metal_cabinet`, Berlin favors `phone_box`
  (repurposed telephone booths). Dropped `operator` — in practice these are
  near-unique community-group names (one operator per bookcase), the same
  "unique code, not a category" trap as `ref`/`name`.
- **luggage-lockers — added.** `[fee, operator]`. Thin globally (1.6k features on
  taginfo) but concentrated at major train hubs: Paris 26, Berlin 22, Munich 15
  (Hauptbahnhof cluster), each with real `fee` (58-87%, skewed but real — a locker
  that's suddenly free is worth surfacing) and `operator` (13-42%, named companies:
  ZeitLager, etc.) coverage. Dropped `indoor` — present but every value is a
  variant of "yes" (`yes`/`room`), not a real binary split.
- **Public-category consolidation.** `fountains` → `amenities` with
  `[drinking_water]` (15-23% coverage, real no/yes/unknown split — tells you if
  the fountain is potable, not just decorative). `clocks` → `services` with
  `[display, support, visibility]` (all 27-48% coverage across Munich/Paris, real
  diversity: analog/digital/sundial; wall/pole/roof/street_lamp/…; area/street/house).
  `guideposts` (`tourism=guidepost`) and `markers`
  (`tourism=information;tourism=guidepost`) **removed** — `guideposts` returned 0
  features in every city checked; real-world guideposts are tagged
  `tourism=information` + `information=guidepost`, which `markers` was already
  redundantly re-querying. `information-boards` (`tourism=information`) → `services`,
  kept as the single template, with the `information` sub-tag promoted to
  `filterableTags` (`board`/`terminal`/`map`/`guidepost`/`office`/`route_marker`) —
  97% coverage in Paris (2.1k features), 100% in Munich (1.6k features). The `public`
  category is now empty and removed from the icon-fallback map. Lesson: a template
  whose primary selector returns 0 features everywhere isn't a tuning problem, it's
  evidence the community moved to a different tagging scheme for the same concept —
  check sibling `tourism=information`/`information=*` style sub-tagging before
  concluding a feature isn't mapped.
- **post-boxes — added.** `[post_box:type]`. `amenity=post_box` is 409k features
  globally — the single biggest gap found in this domain. `operator`/`brand` are
  near-universal (97-100%) but useless: one national postal monopoly per country
  (Deutsche Post 99.9% in Munich/Berlin, La Poste 100% in Paris) — classic flat
  pattern, same as `waste-disposal`'s `access`. `post_box:type` (pillar/lamp/wall
  mounting style) is thinner (4.7-19%) but the only key with real variety. Do not
  confuse with `amenity=letter_box` (private residential mailboxes, opposite
  direction — incoming mail, not a public amenity) — checked the wiki specifically
  to avoid picking the wrong tag here.
- **give-box — added, thin/regional.** `[wheelchair, covered]`. `amenity=give_box`
  (community free-sharing boxes / "Little Free Pantries") is only 1.4k features
  globally, and heavily concentrated in one city's specific movement (Munich's
  "Kreislaufschränke", 22 features vs. Berlin's 11, Paris's 1). Where present,
  `wheelchair` (56% Munich) and `covered` (40% Munich) are real and skewed-but-
  varied. Two demonstrators only, both German — same shape as `bottle-return`,
  added because the signal is real where it exists, not because it's broadly
  viable yet.
- **Considered and rejected: `grit_bin`.** `amenity=grit_bin` (roadside salt/sand
  bins) has real volume in its home region (443 in London, 399 in Munich) but
  every tag is under 5% coverage everywhere — essentially bare nodes. Unlike
  `waste-basket`/`shower` (added anyway for volume), `grit_bin` is also narrowly
  regional (UK/Nordic winter-road safety) with no accessibility or usability
  angle to justify seeding it purely for coverage stats. Not added.
- **Confirmed not a candidate: `letter_box`.** Private residential mailboxes
  (incoming mail to an address), not a public amenity — see post-boxes above.
- **senior-centers — selector was broken, fixed.** The original query,
  `amenity=senior centre`, had zero uses on taginfo (not a real OSM tag; the space in the
  value is a giveaway of hand-typed guesswork, not a wiki-documented key). The real
  tagging is `social_facility:for=senior` (71K+ global uses) on an `amenity=social_facility`
  node, so the selector became `amenity=social_facility&social_facility:for=senior` and the
  template was made a sub-template of `social-facility` (its query is a strict subset).
  Audit every existing selector against taginfo/wiki before tuning its filterableTags —
  a template can look fine in the YAML and still query nothing in the real world.
- **social-facility** `[social_facility, social_facility:for, operator, wheelchair]` vs.
  its child **senior-centers** `[social_facility, operator, wheelchair]` — same two
  wiki-documented keys (`social_facility` = type: nursing_home/day_care/shelter/
  food_bank/...; `social_facility:for` = who it serves) dominate coverage in the parent
  (69-99.7% and 30-72% across 4 cities), and `social_facility` still varies meaningfully
  within the senior-only child (nursing_home vs day_care vs assisted_living). The one
  difference: `social_facility:for` drops out of the child even though it's wiki-relevant,
  because as the sub-template's own query condition it's constant (`senior`) for every
  feature there — coloring by it would be a single-color flat legend. Both dropped
  `operator:type` (3-11% parent, 0-28% child — the weakest candidate in every sampled
  city, not just regionally skewed).
- **community-centre** — `[community_centre, operator, wheelchair]`. `community_centre:for`
  (2-19%) and `fee` (0% everywhere) dropped as near-absent. `wheelchair` (2-32%, near-zero
  in 3 of 4 cities) was initially dropped on coverage but **restored in the consolidation
  pass**: a community centre is an enterable, staffed civic building, so it falls under the
  transversal accessibility rule — the near-empty Missing bucket is the equity finding, not
  a reason to hide the filter (same exception as `sports-centres` and `chalets` below).
- **town-halls** — `[building, wheelchair, townhall:type]`. `building` (townhall vs civic
  vs yes) is well-covered everywhere (38-100%). `wheelchair` is genuinely regional — strong
  in Europe (84-100%), absent in the Rio/Cape Town sample (0%) — kept per the
  crossings precedent. `townhall:type` (UK-documented but picked up elsewhere: 36% Cape
  Town, 95% Paris) encodes administrative level and was added after showing up unprompted
  in "Most used tags". Dropped `operator` — for a town hall it is near-tautological (the
  municipality itself) and inconsistent (0-63%).

### Consolidation pass (epic #245)

The six domain batches (food, sport/recreation, public amenities, tourism, social,
healthcare) were folded into one branch and given a single uniform review. Decisions made
during that pass, beyond the per-domain notes above:

- **`wheelchair` restored on enterable venues.** `community-centre`, `sports-centres` and
  `chalets` had dropped `wheelchair` on low coverage; all three are enterable/staffed
  places a person visits, so the transversal accessibility rule applies (the all-Missing
  legend is the finding). `sports-centres` also now matches `fitness-centers`, the same
  kind of leisure building, which already carried it.
- **`sport` label unified to "Sport".** The `sport` filterableTag key (used only by the
  recreation templates: pitches, sports-centres, stadiums, tracks, ice-rinks) had picked up
  two labels across batches ("Activity" vs "Sport"); consolidated to "Sport" (en) /
  "Deporte" (es) / "Esporte" (pt-BR).
- **motels — added from the gap audit.** `tourism=motel` is wiki-documented short-stay
  lodging (`wheelchair` a documented useful combination). It is regionally concentrated:
  real Brazilian coverage (Sao Paulo 32, Rio 16) but sparse elsewhere (Berlin 6, thin in
  most cities) — the same regionally-mapped pattern as `traffic-calming`, so it earns a
  template demonstrated in Sao Paulo + Rio. `filterableTags [wheelchair]` (near-zero
  coverage, so the all-Missing legend is the accessibility finding; `rooms` is a numeric
  count, a poor color-by). Note the tag spans two regional meanings — the North American
  roadside motor-lodge and the Brazilian/Latin American short-stay motel — so the
  description is kept neutral ("short-stay lodging") across locales.
- **alpine-huts — `access` re-checked, not added.** The wiki documents `access` (public
  vs members-only), but it is 0% in both demonstrators (Chamonix, Zermatt) and is not an
  equity-essential key, so the coverage bar applies — kept as `[operator, capacity]`.
  `wheelchair` stays off: a mountain refuge reached only on foot/ski is the genuine
  "nothing to enter by wheelchair" case, not a coverage drop.
- **Shared-infra fixes carried in from the food batch apply catalog-wide:** the
  semicolon-boundary value match in `buildOverpassQuery` (`prisma/lib/template-parser.ts`)
  and the semicolon-split token counting in `computeTagDimension`
  (`src/lib/filter-dimensions.ts`), merged with healthcare's `keepEmpty` all-Missing legend
  in the same file.

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

### Civic, retail & remaining domains (batch)

Covers the domains left after the mobility/education/food/sport/tourism/social/healthcare/
public-amenity batches: financial, culture, government, emergency, retail shops, markets,
green leisure, barriers, religion — plus the age-view screen-and-skip blocks (nature,
agriculture, infrastructure, housing, environment).

- **places-of-worship — religion consolidation.** `[religion, denomination, wheelchair]`. Replaced
  the five value-templates `church`/`mosque`/`synagogue`/`temple`/`shrine` (each a loose
  `religion=*` selector that also caught cemeteries/schools) with one `amenity=place_of_worship`
  colored by `religion` (the textbook single-key color-by, near-universal). Old ones soft-deprecate.
- **atms** — `[operator, brand, cash_in, wheelchair]`. `cash_in` (deposit y/n) is the usability
  split; `network`/`fee` dropped as near-absent. `wheelchair` kept via the equity exception even
  though the ATM wiki's a11y key is the (globally-empty) `speech_output:*` — an ATM's interface is a
  service point, not street furniture, unlike bicycle-parking/taxi-ranks.
- **banks** — `[brand, operator, atm, wheelchair]`. Enterable → `wheelchair`; `atm=y/n` is a useful
  binary.
- **museums** — `[museum, operator, fee, wheelchair]`. `museum=*` (art/history/local) is the
  defining categorical, kept at moderate coverage. `memorials` `[memorial]` (type is the color-by;
  outdoor → no `wheelchair`); `monuments` age-view.
- **fire-hydrants** (new) — `[fire_hydrant:type, fire_hydrant:position, fire_hydrant:diameter,
  fire_hydrant:pressure]`. type/position near-universal; `diameter` (mm, small value set) and
  `pressure` (bar) are wiki-foundational capacity descriptors — regional coverage, Missing is the
  signal, demonstrate in DE. Dropped `colour` (US AWWA regional), `couplings:type` (globally empty),
  `water_source` (single-valued `main`). **Lesson:** check a regionally-standardized key across
  countries before dropping — but these were dead everywhere, not a German artifact.
- **defibrillators** (new) — `[access, indoor]`. `indoor` is the main split, `access` the
  public-vs-restricted one. Dropped `locked` (0%). Life-safety data worth surfacing even thin.
- **markets** (new) — **age-view only.** Wiki keys (`operator`, `organic`) near-absent in
  well-mapped cities → no viable color-by. Multi-vendor vocabulary keeps it out of `shops` tuning.
- **shops** — `wheelchair` (equity-keep) on every storefront + `brand` (chain-vs-independent).
  `supermarkets` +`[operator, organic]`, `greengrocers` +`[organic]`, `clothes` +`[clothes]`
  (men/women/children), `fuel` `[brand, operator]` (unstaffed forecourt → no wheelchair; fuel-type
  keys are fragmented `fuel:*` booleans).
- **government / emergency stations** — `government-office` `[government, operator, admin_level,
  wheelchair]` (`admin_level` = national/state/municipal, wiki-recommended but thin ~5%; `operator`
  kept — live coverage shows it's the richer dimension), `courts`/`police-stations`/`fire-stations`
  `[operator, wheelchair]`, `ambulance-stations` `[operator]`. `prisons`/`emergency-phones` age-view.
  **Selector fixes (live-validation catch, same lesson as speed-cameras):** `courts` queried the
  non-existent `amenity=court` → fixed to `amenity=courthouse`; `ambulance-stations` queried
  `amenity=ambulance_station` (24 objects worldwide) → `emergency=ambulance_station` (16k);
  `fitness-centers` queried US-spelled `leisure=fitness_center` (0 worldwide) → `leisure=fitness_centre`.
  All three returned empty everywhere until fixed — confirm a selector matches real features before tuning.
- **green leisure** — `parks` `[access]`, `gardens` `[garden:type, access]`, `marinas` `[fee,
  operator]` (dropped `access` — near-zero + not on the marina wiki page), `golf-courses` age-view
  (dropped `access` — 0-8% and not wiki-listed; operator/fee equally thin, so no filter),
  `fitness-centers` `[sport, wheelchair]` (`sport` is the best-covered, best-varied key here —
  yoga/fitness/pilates/cycling, ~51% Berlin — and the de-facto type dimension mappers use; added
  despite not being on the wiki's recommended-combination list, a data-over-wiki exception), `gates`
  `[access]` (locked/public split). `shopping-malls`
  `[operator]` (wiki tags the mall building not inner shops, so `wheelchair` reads low; operator is
  the wiki-endorsed key though also thin).
- **Screen-and-skip (age-view only):** nature (trees, water, forests, natural surfaces),
  agriculture (already observable-infrastructure only), man_made infrastructure (towers, tanks,
  lamps), housing (apartments/houses/residential — `building:levels` is numeric), environment
  (waterfall/dam), and the remaining outdoor barriers (walls/fences/hedges). Natural and
  structural features carry no single well-covered usability key to color by.

## Validation the sync enforces

`prisma/lib/template-parser.ts` (tests: `prisma/lib/__tests__/template-parser.test.ts`).

**Fails** `pnpm db:sync`/CI on:

- Unknown parent id.
- Malformed `demonstrators` — scalar/array root, unknown template id, `area` that is not
  a positive integer, non-string `note`.

**Warns** (non-blocking):

- Unknown template id under `filterableTags` — a typo there only leaves that one template
  age-view-only, so it never blocks the seed/deploy.
