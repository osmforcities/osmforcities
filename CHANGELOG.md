# osmforcities

## 1.18.0

### Added

- German is now a full app language alongside English, Spanish, Portuguese and French, with translated names and descriptions across the template catalog [#484]

### Changed

- The dataset refresh cron only updates cataloged datasets (featured or saved by someone), so hidden cache-row datasets no longer hit Overpass — previously ~91% of daily refresh load was waste [#485]
- Datasets nobody ever featured or saved are deleted after a 30-day grace period, and deactivated oversized datasets have their stored GeoJSON cleared [#485]

[#484]: https://github.com/osmforcities/osmforcities/pull/484
[#485]: https://github.com/osmforcities/osmforcities/pull/485

## 1.17.1

### Fixed

- The basemap no longer shows CARTO's "API KEY REQUIRED" watermark — tile requests now carry a CARTO Basemaps API key, baked into the build so every environment gets it [#472], [#473]
- Clicking a polygon feature at low zoom opens its detail panel again — the proxy circles that stand in for small polygons below ~z14 are now clickable and show a pointer cursor [#469]

[#469]: https://github.com/osmforcities/osmforcities/pull/469
[#472]: https://github.com/osmforcities/osmforcities/pull/472
[#473]: https://github.com/osmforcities/osmforcities/pull/473

## 1.17.0

### Added

- French is now a full app language alongside English, Spanish and Portuguese, with translated names and descriptions across the template catalog [#458]

### Changed

- Dataset downloads are substantially smaller — GeoJSON exports are no longer pretty-printed, cutting a São Paulo bicycle-parking download from 6.5 MB to 4.0 MB [#457]
- Area boundaries are cached instead of re-read and re-simplified on every request, so dataset and area pages stop repeating the same multi-megabyte work [#457]
- The navbar now stretches to the full window width [#454]

### Fixed

- Search results show translated address labels instead of leaking raw `AddressTypes` message keys [#455]

### Security

- Updated the transitive `nanoid` dependency to 3.3.18, clearing a high-severity advisory about custom generators looping indefinitely at size zero

[#454]: https://github.com/osmforcities/osmforcities/pull/454
[#455]: https://github.com/osmforcities/osmforcities/pull/455
[#457]: https://github.com/osmforcities/osmforcities/pull/457
[#458]: https://github.com/osmforcities/osmforcities/pull/458

## 1.16.1

### Fixed

- Datasets no longer get stuck behind a false "too large" pre-flight failure: template queries now use exact tag matching on indexed keys, so size checks answer in ~1s instead of timing out, and a timed-out check is retried after 30 minutes instead of being cached for 24 hours [#446]

[#446]: https://github.com/osmforcities/osmforcities/pull/446

## 1.16.0

### Added

- New dataset templates across many domains: markets, fire hydrants, defibrillators, and a wide set of food, sport, public-amenity, tourism, and social-care templates from a wiki-grounded catalog review [#438], [#417]
- Healthcare template pass: 11 allied-health templates (opticians, physiotherapists, psychotherapists, laboratories, and more) plus blood-donation, dialysis-centres, and midwives, with a localized specialty legend [#414]

### Changed

- Curated per-template map legends ("Color by") tuned against live coverage across the whole template catalog, with demonstrator cities and refreshed category icons [#438], [#417], [#414]
- Consistent zoom control on all platform maps [#436]
- Align area and line map strokes with point-marker styling for a coherent look [#437]

### Fixed

- Judge dataset-fleet health against the real 24h refresh cadence — on both /api/health and the admin dataset-updates badge — to stop false "degraded" reports [#435], [#443]
- Stop a single failing dataset from jamming the dataset-update queue [#432]

[#414]: https://github.com/osmforcities/osmforcities/pull/414
[#417]: https://github.com/osmforcities/osmforcities/pull/417
[#432]: https://github.com/osmforcities/osmforcities/pull/432
[#435]: https://github.com/osmforcities/osmforcities/pull/435
[#436]: https://github.com/osmforcities/osmforcities/pull/436
[#437]: https://github.com/osmforcities/osmforcities/pull/437
[#438]: https://github.com/osmforcities/osmforcities/pull/438
[#443]: https://github.com/osmforcities/osmforcities/pull/443

## 1.15.0

### Added

- Redesigned dataset detail side-panel: compact tiered layout with stored stats and geometry-mix, edit/mapper recency, and tag-coverage charts, plus accessible freshness pills [#390]
- Per-template filterable-tag allow-list with a curated, localized map legend [#380]
- Template-management workflow and demonstrator-city registry, with filterableTags tuned against real data across core templates [#406]
- Education-domain templates and filterable tags (5 new templates) [#408]
- Mobility template tuning and a transit-platforms template [#415]

### Changed

- Render area names in the active locale across area and dataset pages [#381]
- Geometry-mix legend shows full grouped numbers (e.g. `22,986 m²`) with an icon-led section header [#404]

### Fixed

- Localize the dataset breadcrumb back-link area name from the server-resolved name [#416]
- Prevent hero map clipping on short windows [#382]

### Security

- Dependency security sweep [#400]

[#380]: https://github.com/osmforcities/osmforcities/pull/380
[#381]: https://github.com/osmforcities/osmforcities/pull/381
[#382]: https://github.com/osmforcities/osmforcities/pull/382
[#390]: https://github.com/osmforcities/osmforcities/pull/390
[#400]: https://github.com/osmforcities/osmforcities/pull/400
[#404]: https://github.com/osmforcities/osmforcities/pull/404
[#406]: https://github.com/osmforcities/osmforcities/pull/406
[#408]: https://github.com/osmforcities/osmforcities/pull/408
[#415]: https://github.com/osmforcities/osmforcities/pull/415
[#416]: https://github.com/osmforcities/osmforcities/pull/416

## 1.14.0

### Added

- Full-bleed, map-first layout for dataset pages [#349]
- Featured dataset hero map with info card on the home page [#356]
- Public pages for featured datasets [#373]
- Interactive map legend with curated color themes [#374]
- Zoom-responsive map rendering with a viridis-based data-age palette [#372]
- Dataset size cap at 25 MB with cached size-check verdicts [#363]

### Changed

- Center dataset and featured hero maps on the OSM admin_centre for large areas [#369], [#371]
- Slim the featured hero-map GeoJSON payload — Sao Paulo 10 MB -> 2.5 MB, Amsterdam 5.1 MB -> 2.3 MB [#377]
- Per-template map icons with category fallback [#365]
- Add filter-dimension computation helper (groundwork for the filter panel, epic #184) [#355]
- Audit and slim down the Playwright test suite [#351]

### Fixed

- Consistent zoom-to-area for the featured hero card [#376]
- Count only real dataset views by firing analytics events client-side, excluding scrapers [#353]
- Broken dataset links in report emails [#352]
- Lazy TTL refresh on area info to avoid stale/blocking lookups [#371]

[#349]: https://github.com/osmforcities/osmforcities/pull/349
[#351]: https://github.com/osmforcities/osmforcities/pull/351
[#352]: https://github.com/osmforcities/osmforcities/pull/352
[#353]: https://github.com/osmforcities/osmforcities/pull/353
[#355]: https://github.com/osmforcities/osmforcities/pull/355
[#356]: https://github.com/osmforcities/osmforcities/pull/356
[#363]: https://github.com/osmforcities/osmforcities/pull/363
[#365]: https://github.com/osmforcities/osmforcities/pull/365
[#369]: https://github.com/osmforcities/osmforcities/pull/369
[#371]: https://github.com/osmforcities/osmforcities/pull/371
[#372]: https://github.com/osmforcities/osmforcities/pull/372
[#373]: https://github.com/osmforcities/osmforcities/pull/373
[#374]: https://github.com/osmforcities/osmforcities/pull/374
[#376]: https://github.com/osmforcities/osmforcities/pull/376
[#377]: https://github.com/osmforcities/osmforcities/pull/377

## 1.13.0

### Added

- Admin-only manual dataset refresh with last-fetched timestamp caption [#346]
- Analytics: track sign-in, sign-out, downloads, page views, and featured-toggle events [#335], [#336], [#344], [#345]

### Changed

- Send visitor IP via `x-umami-client-ip` so server-side events resolve the right city [#344]
- Bound Umami fetch timeout and make event tracking non-blocking in routes [#335], [#336]
- Batch cron refresh tracking and gate manual dataset refresh to admins [#346]

### Fixed

- Featured dataset toggle now reflects the dataset's real featured state on the detail page. The dataset query omitted `isFeatured`, so the button always initialized as "not featured" (requiring two clicks to enable and showing the wrong state after reload) [#335]
- Admin status now refreshes from the database on every session check. Previously `isAdmin` was only written to the session token at sign-in, so an admin whose session predated their promotion (or whose token claims were reset by the next-auth upgrade) saw admin-only controls — including the featured toggle — hidden until signing out and back in [#335]
- Token refresh now fails closed on deleted users and uses edge-runtime-safe logging [#335]

### Security

- Bump js-yaml to 4.2.0 (DoS fix in the merge operator) [#337]

[#335]: https://github.com/osmforcities/osmforcities/pull/335
[#336]: https://github.com/osmforcities/osmforcities/pull/336
[#337]: https://github.com/osmforcities/osmforcities/pull/337
[#344]: https://github.com/osmforcities/osmforcities/pull/344
[#345]: https://github.com/osmforcities/osmforcities/pull/345
[#346]: https://github.com/osmforcities/osmforcities/pull/346

## 1.12.0

### Added

- Area page redesign: unified data-type browser with status filters, explore-style sections, and category discovery [#330]
- Template parent-child hierarchy support [#325]
- Save-limit quota UX [#328]

### Changed

- Renamed "Watch" to "Save" across UI strings, icons, schema, and the `dataset_watches` table (now `dataset_saves`) [#321], [#324], [#328]
- Explore listings restricted to featured or saved datasets [#327]
- Cache active templates query by locale [#332]
- CI: removed Cloudflare-blocked post-deploy health checks [#329]

### Security

- Resolved pnpm audit vulnerabilities [#333]

[#321]: https://github.com/osmforcities/osmforcities/pull/321
[#324]: https://github.com/osmforcities/osmforcities/pull/324
[#325]: https://github.com/osmforcities/osmforcities/pull/325
[#327]: https://github.com/osmforcities/osmforcities/pull/327
[#328]: https://github.com/osmforcities/osmforcities/pull/328
[#329]: https://github.com/osmforcities/osmforcities/pull/329
[#330]: https://github.com/osmforcities/osmforcities/pull/330
[#332]: https://github.com/osmforcities/osmforcities/pull/332
[#333]: https://github.com/osmforcities/osmforcities/pull/333

## 1.11.0

### Added

- Explore page sections: recently added, largest, most edited, most contributors [#311]
- MapLibre expression builders for auto-detected themes with blue-orange boolean palette and legend generation [#298]
- Workflow requirement: develop as source branch for main PRs [#313]

### Changed

- Dataset stats promoted to first-class indexed columns [#312]
- Explore page: extracted reusable components, simplified section pages, prioritized recently edited section [#311]
- Map themes: code quality improvements and translations [#298]

### Fixed

- Explore page: removed locale prefix from navigation links [#311]
- Explore page query performance with geojson exclusion and indexes [#309]
- Migration: added IF EXISTS guard to DROP INDEX [#309]
- Dataset stats: narrowed processDatasetStats parameter type [#312]
- i18n: added translation key for age option in theme selector [#298]

[#298]: https://github.com/osmforcities/osmforcities/pull/298
[#309]: https://github.com/osmforcities/osmforcities/pull/309
[#311]: https://github.com/osmforcities/osmforcities/pull/311
[#312]: https://github.com/osmforcities/osmforcities/pull/312
[#313]: https://github.com/osmforcities/osmforcities/pull/313

## 1.10.0

Featured datasets and a new Explore page make public discovery actionable:
users can browse highlighted datasets and navigate the catalog without signing in.

### Added

- Featured datasets: isFeatured field, admin toggle API, and badge on dataset detail page [#260], [#262]
- /explore page with improved dataset cards, category groups, and countryCode flags [#283]
- Map themes: auto-detect categorical vs. intensity visualization styles from dataset values [#281]
- Category model with parent/child relationships and YAML-to-DB sync [#280]
- Map tile provider config via env var; CartoDB with multi-subdomain fallback [#261]
- i18n review script with auto-discovered locales and word-boundary matching [#301]

### Changed

- DatasetCard redesign with stats slot and improved accessibility [#282]
- Homepage: replace multi-color accent rotation with consistent olive palette [#300]
- Area conversion: deep AreaConversion module with Zod validation [#299]
- Overpass snapshot pipeline deepened with structured logging [#284]
- Dataset transform service extracted from datasets API route [#274]

### Fixed

- Accessibility: missing aria-label/aria-labelledby on breadcrumbs, search, and dashboard grid [#248]
- Category relation included in all dataset API responses [#296]
- Overpass errors no longer exposed to clients [#247]
- Feature toggle: atomic TOCTOU fix [#262]

[#247]: https://github.com/osmforcities/osmforcities/pull/247
[#248]: https://github.com/osmforcities/osmforcities/pull/248
[#260]: https://github.com/osmforcities/osmforcities/pull/260
[#261]: https://github.com/osmforcities/osmforcities/pull/261
[#262]: https://github.com/osmforcities/osmforcities/pull/262
[#274]: https://github.com/osmforcities/osmforcities/pull/274
[#280]: https://github.com/osmforcities/osmforcities/pull/280
[#281]: https://github.com/osmforcities/osmforcities/pull/281
[#282]: https://github.com/osmforcities/osmforcities/pull/282
[#283]: https://github.com/osmforcities/osmforcities/pull/283
[#284]: https://github.com/osmforcities/osmforcities/pull/284
[#296]: https://github.com/osmforcities/osmforcities/pull/296
[#299]: https://github.com/osmforcities/osmforcities/pull/299
[#300]: https://github.com/osmforcities/osmforcities/pull/300
[#301]: https://github.com/osmforcities/osmforcities/pull/301

## 1.9.2

### Patch Changes

- Migrate to fetchDatasetSnapshot, delete useOverpassQuery [#234]
- Add dataset staleness check to /api/health endpoint [#214]
- Fix Umami session fingerprinting [#233]

[#234]: https://github.com/osmforcities/osmforcities/pull/234
[#214]: https://github.com/osmforcities/osmforcities/pull/214
[#233]: https://github.com/osmforcities/osmforcities/pull/233

## 1.9.1

### Added

- Responsive mobile layout for hero section with scaled typography (#229)

### Changed

- Centralize analytics event constants and enhance Umami tracking with client info (#230)
- Cleaner search placeholder behavior (#228)

## 1.9.0

### Minor Changes

- Public discovery: search and area pages now accessible without authentication. Logged-out users see dataset upsell CTA.

## 1.8.0

### Added

- SEO infrastructure: meta tags, structured data (JSON-LD), sitemap.xml, robots.txt (#168, #223)
- Branding assets: favicons, Apple touch icon, PWA icons, OG image, PWA manifest (#222)
- AOI bounds display on dataset pages with boundary API endpoint (#221)
- Hotels template (tourism=hotel) with translations (#219)

### Changed

- Reposition SEO from "monitor changes" to "browse and download city data" across all locales (#224)

## 1.7.0

### Minor Changes

### Added

- Feature detail panel on dataset map: click a map feature to open a panel showing its OSM tags and metadata (#208)
- Highlight selected feature on the map while detail panel is open
- Pointer cursor on hoverable map features

## 1.6.5

### Patch Changes

### Added

- Self-hosted Umami analytics with server-side event tracking:
  - User funnel: sign-up, follow
  - Dataset lifecycle: refresh, data count change, deprecation
  - Dataset engagement: map view, GeoJSON export
- MIT license

### Changed

- Cap max follows per user at 10; returns 403 with `follow_limit_reached` on excess

### Fixed

- Use app hostname (not analytics server) in Umami payload

## 1.6.4

### Patch Changes

- Emit additional server-side Umami events for dataset lifecycle (create, follow, unfollow, user refresh, cron refresh), page views (area template discovery, dataset detail, watched dashboard), and GeoJSON download via `GET /api/datasets/[id]/export`.

### Fixed

- Dataset GeoJSON download falls back to client-side blob when the export API returns a non-success response (#205).
- Fix session cookie domain isolation between staging and production (#201)

## 1.6.3

### Patch Changes

### Changed

- Refactor email internationalization to use `use-intl/core` translator APIs.
- Switch default Overpass API endpoint to VK Maps with opt-in User-Agent behavior.

### Fixed

- Fix email formatting and translation interpolation issues introduced during i18n refactor.
- Fix deprecated dataset notice handling in user reports (correct template at `daysRemaining = 0` and include all deprecated dataset notices).
- Improve email test stability by clearing translation message cache between test runs.

## 1.6.2

### Patch Changes

- Fix email gender agreement - use correct grammatical gender based on user profile setting

## 1.6.1

### Patch Changes

- Fix user report submission concurrency issues

## 1.6.0

### Minor Changes

- Release v1.6.0

  - Move dashboard to /dashboard route with locale-aware navigation (#156)
  - Add Storybook v10 with component testing (#157)
  - Localize email notifications with ICU plural format (#176)
  - Add email notification translations (#174)
  - Add template sync and 30-day soft deprecation (#172)
  - Add template translations (#160)
  - Fix auth redirects, search input, CI deploy workflow
  - Require tests to pass before deployment

## 1.5.1

### Patch Changes

- Fix Create Account button to link to /enter route

## 1.5.0

### Minor Changes

- Revamp homepage with hero section, features showcase, dataset showcase, use cases, and final CTA sections. Add reusable Heading component with typography scale and CategoryCard component. Integrate Design Atlas tokens for consistent styling. Improve dashboard empty state with search functionality. Fix translation/i18n issues including date placeholders, spacing, and missing translations. Enhance test infrastructure with Playwright improvements and CI stability fixes.

## 1.4.3

### Patch Changes

- Fix React Server Components security vulnerabilities (CVE-2025-55183, CVE-2025-55184, CVE-2025-67779) and ensure Next.js production builds pass in CI.

  - Upgrade Next.js 15.3.6 → 15.5.9
  - Upgrade React 19.2.1 → 19.2.3
  - Upgrade react-dom 19.2.1 → 19.2.3
  - Fix [locale] layout type signature for Next 15.5.9 compatibility
  - Add Next.js production build step to CI checks workflow

## 1.4.2

### Patch Changes

- Patch critical React Server Components security vulnerability (CVE-2025-55182)

  - Upgrade Next.js 15.3.3 → 15.3.6
  - Upgrade React 19.1.0 → 19.2.1
  - Upgrade react-dom 19.1.0 → 19.2.1
  - Upgrade eslint-config-next 15.3.3 → 15.3.6

  Fixes unauthenticated remote code execution vulnerability (CVSS 10.0)

## 1.4.1

### Patch Changes

- Fix email subscription logic to prevent reports when no recent dataset activity

## 1.4.0

### Minor Changes

- Add CI/CD deployment automation for production environment and API metadata endpoint

## 1.3.0

### Minor Changes

- ## Features

  - Enhanced session persistence and cross-domain authentication
  - Require email verification for user reports

  ## Fixes

  - Fix user reports to include watched datasets instead of owned
  - Update deprecated /watched link to dashboard in user reports
  - Change cookie prefix from **Host- to**Secure- for better compatibility

## 1.2.0

### Minor Changes

- ## Features

  - Complete tab navigation layout consistency with accessibility improvements
  - Simplify dashboard to focus on followed datasets
  - Add consistent User-Agent headers for OSM API requests
  - Remove deprecated area generation code

  ## Fixes

  - Remove logout noise and enable email sending in development
  - Prevent immediate email when users enable or change email report preferences
  - Update authentication variables and configuration

  ## Infrastructure

  - Complete Postmark email migration for improved deliverability
  - Enhance deployment playbook with explicit branch checkout
  - Seamless Area Discovery Migration for better UX

  ## Developer Experience

  - Remove hardcoded Overpass API URL
  - Migrate navbar to React Aria with Design Atlas tokens
  - Add age-based visual highlighting for better data visualization

## 1.1.0

### Minor Changes

- Postmark email migration, enhanced dataset explorer, minimal area page, navigation improvements, and enhanced testing

## 1.0.0

### Patch Changes

- Add changesets for version management
