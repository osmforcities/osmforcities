# osmforcities

## 1.11.0

### Minor Changes

- Release 1.11.0

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
  - Change cookie prefix from **Host- to **Secure- for better compatibility

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
