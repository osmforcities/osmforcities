# Dataset Map Components

This folder contains the components for rendering geographic datasets on interactive maps with **age-based visual highlighting**.

## Visual Highlighting System

The map now uses a sophisticated color-coding system to highlight features based on their last edit date, solving the fundamental issue where date filtering would miss deleted features:

- 🟢 **Green** (≤7 days): Very recently changed features
- 🟠 **Orange** (8-30 days): Recently changed features  
- 🟡 **Yellow** (31-90 days): Somewhat recently changed features
- ⚫ **Gray** (>90 days): Older features

This approach provides users with a complete and accurate representation of the data while highlighting recent changes.

## Component Structure

- **`index.tsx`** - Main DatasetMap component with legend integration
- **`date-filter-controls.tsx`** - Date filtering UI for showing data from different time periods
- **`feature-tooltip.tsx`** - Tooltip component for displaying feature properties and metadata
- **`map-layers.tsx`** - Map layer management with age-based styling for polygons, lines, and points
- **`no-data-message.tsx`** - Message display when no geographic data is available
- **`age-legend.tsx`** - Visual legend component for age categories

## Supporting Files

- **`hooks.ts`** - Custom React hooks for map interactions and date filtering

## Data Processing

Data processing utilities have been moved to `src/lib/`:

- **`lib/utils.ts`** - Utility functions for date calculations, feature filtering, and bbox calculations
- **`lib/osm-data-processor.ts`** - Processes OSM features with age categorization and filtering

## Usage

```tsx
import DatasetMap from "@/components/dataset-map";

<DatasetMap dataset={datasetData} />
```

## Design Principles

- **Single Responsibility**: Each component has one clear purpose
- **Co-location**: Related components are kept together in the same folder
- **Composition**: Main component orchestrates smaller, focused components
- **Separation of Concerns**: Logic is separated into utilities, processors, and hooks
- **Reusability**: Components can be reused within the dataset-map context
- **Maintainability**: Clean separation makes code easier to understand and modify
- **Organized Structure**: Hooks, utilities, and processors are logically grouped
