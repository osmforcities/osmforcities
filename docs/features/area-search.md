# Area Search Feature

## Overview

The area search functionality allows users to find geographic areas (cities, regions, etc.) using the [Nominatim API](https://nominatim.openstreetmap.org/). This feature is implemented client-side and is designed to be used in components that require area selection, such as the navigation bar search.

## Technical Implementation

The implementation is split into a library file for API communication and a React hook for easy integration into components.

### 1. Nominatim Library (`osmforcities/src/lib/nominatim.ts`)

This file contains the core logic for interacting with the Nominatim API.

- `searchAreasWithNominatim(searchTerm, language)`: This function takes a search term and an optional language, queries the Nominatim API, and returns a promise that resolves to an array of validated search results. It filters for results of `osm_type === "relation"` to ensure we only get areas.
- `getAreaDetailsById(osmRelationId, language)`: Fetches detailed information for a specific area using its OSM relation ID.
- `convertNominatimResultToArea(result)`: A utility function to convert a raw Nominatim result into the application's `Area` type.

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
