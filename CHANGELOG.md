# osmforcities

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
