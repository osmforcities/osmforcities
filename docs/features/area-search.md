# Area Search Feature

## Overview

The area search functionality allows users to find geographic areas (cities, regions, etc.) using the [Nominatim API](https://nominatim.openstreetmap.org/). This feature is implemented client-side and is designed to be used in components that require area selection, such as the navigation bar search.

## Technical Implementation

The implementation is split into a library file for API communication and a React hook for easy integration into components.

### 1. Nominatim Libraries

- `src/lib/nominatim-search.ts` (client, nav search): `searchAreasWithNominatim(searchTerm, language, signal?)` queries `/search` and resolves to validated relation results.
  - Requests `extratags=1` and collapses results that are the same place (transitively): same `wikidata`, or same name and bounding box (Paris commune + département; a Brazilian municipality + its seat district, which has no wikidata). Keeps the higher `importance`, then the most local `admin_level` on a tie.
  - Orders results by scale using Nominatim `place_rank`: cities and below, then states/regions, then countries, keeping Nominatim's order within each scale (a strict local-first sort would rank City of London above Greater London).
  - Spaces searches at least 1 s apart per browser (Nominatim usage policy). A search aborted via `signal` (React Query cancels it when the term changes) rejects immediately and frees its slot.
- `src/lib/area-search.ts`: dedupe and ranking helpers, plus `toAreaSearchResult`, which adds row context for the dropdown — parent chain (state, country, skipping the component that is the result itself) and population when tagged. A same-named boundary Nominatim demoted to "suburb" is labelled "city".
- `src/lib/nominatim.ts` (server): `getAreaDetailsById(osmRelationId, language)` fetches a relation via `/lookup` and converts it with `fromNominatim` from `@/lib/area-conversion`. It shares `NominatimResultSchema` with search; malformed ranking hints (`importance`, `place_rank`, `extratags`) are dropped rather than failing the lookup.

### 2. React Hook (`osmforcities/src/hooks/useNominatimSearch.ts`)

This file provides a React hook to simplify using the search functionality in components.

- `useNominatimSearch({ searchTerm, language, enabled })`: A hook that wraps `searchAreasWithNominatim` with `@tanstack/react-query`. It handles fetching, caching, and state management (loading, error states) for the search query. The search is only triggered if `enabled` is true and the search term is at least 3 characters long.
- `useNominatimAreas(...)`: A convenience hook that builds on `useNominatimSearch` and returns the data already mapped to the `Area[]` type.

## Usage

To add area search to a component:

1. Import the `useNominatimAreas` hook.
2. Call the hook with the user's search term.
3. The hook will return the search results, loading state, and any errors.
4. Render the results to the user. On selection, you can use the `id` (which is the OSM relation ID) to navigate to a specific area page, e.g., `/area/{id}`.

## Area Page Integration

The area search feature integrates with the area page at `/area/{osmRelationId}` which displays:

- **Area Information**: Name, state, country, and OSM relation ID
- **Available Datasets**: Grid of all available data templates for the area
- **Navigation**: Breadcrumb navigation and external link to OpenStreetMap
- **Empty State**: User-friendly message when no datasets are available

The area page uses the `DatasetGrid` component to display templates as datasets, providing a seamless user experience for discovering and accessing data for any geographic area.

### Dataset Filtering

The `DatasetGrid` component (`osmforcities/src/components/ui/template-grid.tsx`) includes:

- **Category Pills**: Filter datasets by category (education, healthcare, transportation, etc.)
- **Text Search**: Search across dataset names, descriptions, and tags
- **Combined Filtering**: Both filters work together for precise results
- **Responsive Design**: Works across all screen sizes

**Potential Enhancements**: Custom category icons for better visual recognition
