# Dataset Page Layout

## Overview

The dataset page displays dataset information and interactive maps in a responsive layout with breadcrumb navigation.

## Layout Structure

### Grid Layout

- **Desktop**: 1/3 info panel + 2/3 map panel
- **Mobile**: Single column (stacked)
- **Container**: Centered with max-width, responsive design

### Breadcrumb Navigation

- **Path**: Home → Country → State → Area → Dataset Template
- **Location**: Top of page, above main content
- **Purpose**: Provides navigation context and quick access to parent pages

### Height Management

- **Full Viewport**: Uses `calc(100vh - var(--nav-height))` to fill available space
- **No Scrolling**: Content fits within viewport without vertical overflow
- **Responsive**: Adapts to different screen sizes

## Components

### Info Panel (Left)

- Dataset information and statistics
- Action buttons (watch, refresh, etc.)
- Scrollable content area
- Fixed height to match map panel

### Map Panel (Right)

- Interactive map visualization
- Legend positioned in top-right corner
- Map controls and filters
- Same height as info panel

## User Experience

### Navigation

- Breadcrumb provides clear context of current location
- Clickable breadcrumb items for easy navigation
- No redundant back buttons (breadcrumb handles navigation)

### Layout Benefits

- Balanced proportions (1/3 + 2/3) provide optimal information density
- Map gets appropriate space without being excessively wide
- Info panel has sufficient space for detailed content
- Responsive design works on all screen sizes

### Visual Design

- Card-based layout with consistent styling
- White backgrounds with subtle borders and shadows
- Clean spacing and typography
- Professional, modern appearance
