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
