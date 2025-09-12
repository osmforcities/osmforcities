# Dashboard Page Feature

## Overview

The dashboard page serves as the main landing page for authenticated users, providing a clean, focused view of their followed datasets aligned with the seamless dataset discovery workflow.

## Current Implementation

### Page Structure

**File**: `src/app/[locale]/page.tsx`

```typescript
// Server component with data fetching
export default async function Home() {
  const session = await auth();
  const user = session?.user || null;
  
  if (!user) {
    // Landing page for unauthenticated users
    return <LandingPage />;
  }
  
  const watchedDatasets = await getWatchedDatasets(user.id);
  return <DashboardPage datasets={watchedDatasets} />;
}
```

### Data Fetching

```typescript
async function getWatchedDatasets(userId: string) {
  const watchedDatasets = await prisma.datasetWatch.findMany({
    where: { userId },
    include: {
      dataset: {
        include: {
          template: true,
          area: true,
          _count: {
            select: { watchers: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return watchedDatasets.map((watch) => watch.dataset);
}
```

### UI Components

**Dashboard Grid**: `src/components/dashboard/dashboard-grid.tsx`

- **Type Definition**: Simplified Dataset type without authorship
- **Empty State**: Guidance to search cities for discovery
- **Dataset Cards**: Link to stable routes `/area/{areaId}/dataset/{templateId}`

## Key Features

### Clean Dashboard Design

The dashboard has been simplified to focus on essential functionality:

- **Simple Title**: "Dashboard" instead of personalized greetings
- **Clear Purpose**: "Here are the datasets you're following"
- **Followed Datasets**: Grid display of user's watched datasets
- **Empty State Guidance**: Directs users to city search for discovery

### Followed Datasets Grid

Displays the user's currently watched datasets using the `DashboardGrid` component:

- **Dataset Cards**: Show template name, city, and country code
- **Category Icons**: Visual indicators for dataset categories  
- **Status Badges**: Active/Inactive indicators
- **Watcher Count**: Number of users following each dataset
- **Stable Routes**: Links to `/area/{areaId}/dataset/{templateId}`

## Seamless Discovery Integration

### Removed Old Workflows

The dashboard eliminates concepts from the old wizard-based approach:

- ❌ **Dataset Authorship**: No user ownership references
- ❌ **Public/Private**: All datasets are discoverable
- ❌ **Create Dataset Button**: No wizard workflow access
- ❌ **Browse Public Button**: No public/private distinction
- ❌ **User Statistics**: No creation/ownership metrics

### New Discovery Flow

The dashboard guides users toward seamless discovery:

1. **Empty State**: Shows when user has no followed datasets
2. **Search Guidance**: "Search for cities to discover available datasets"
3. **Search Button**: Direct link to city search functionality
4. **Stable Navigation**: Dataset cards link to predictable URLs

## Technical Requirements

### Database Schema Changes

```sql
-- Remove authorship and public/private concepts
ALTER TABLE "Dataset" DROP COLUMN "userId";
ALTER TABLE "Dataset" DROP COLUMN "isPublic";

-- Add unique constraint for stable identification
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_templateId_areaId_key" 
UNIQUE ("templateId", "areaId");
```

### Route Structure

**Required Routes**:
- `/area/[areaId]/page.tsx` - Area overview with available datasets
- `/area/[areaId]/dataset/[templateId]/page.tsx` - Dataset view with on-demand creation

**On-Demand Creation Logic**:
```typescript
async function getOrCreateDataset(areaId: number, templateId: string) {
  let dataset = await db.dataset.findUnique({
    where: { templateId_areaId: { templateId, areaId } }
  });

  if (!dataset) {
    // Create on-demand with loading state
    dataset = await createDatasetOnDemand(areaId, templateId);
  }

  return dataset;
}
```

### Component Requirements

**DashboardGrid Component**:
- ✅ Remove authorship references
- ✅ Remove public/private concepts  
- ✅ Use stable routes
- ✅ Clean empty state
- ❓ Handle loading states for on-demand creation
- ❓ Error handling for failed dataset access

## Design System Integration

### React Aria Components

- Uses `GridList` and `GridListItem` for accessible dataset grid
- Implements proper keyboard navigation and screen reader support
- Follows React Aria patterns for consistent accessibility

### Styling Approach

- **TailwindCSS**: Consistent spacing and typography
- **Design Tokens**: Uses Design Atlas color palette where applicable
- **Responsive Grid**: Adapts to mobile, tablet, and desktop layouts

## User Experience

### Empty State

When users have no followed datasets:

```typescript
<div className="text-center py-12">
  <h3>No datasets followed yet</h3>
  <p>Start following datasets to see them here. 
     Search for cities to discover available datasets.</p>
  <Button asChild>
    <Link href="/search">Search Cities</Link>
  </Button>
</div>
```

### Dataset Cards

Each dataset card displays:

- **Template Name**: Clear identification of dataset type
- **City & Country**: Geographic context with country code
- **Category Badge**: Visual categorization
- **Status Indicator**: Active/Inactive state
- **Watcher Count**: Community engagement metric

### Navigation

- **Stable URLs**: Cards link to `/area/{areaId}/dataset/{templateId}`
- **Predictable Routes**: URLs are shareable and bookmarkable
- **On-Demand Creation**: Datasets created when first accessed

## Testing Coverage

### Dashboard Workflows (`tests/dashboard-workflows.spec.ts`)

- ✅ **Dashboard Display**: Title, subtitle, and layout verification
- ✅ **Empty State**: Proper guidance and search button functionality
- ✅ **Dataset Cards**: Correct information display and structure
- ✅ **Stable Routes**: Navigation to new URL format
- ✅ **Responsive Design**: Mobile, tablet, desktop layouts
- ✅ **Clean UI**: No authorship or public/private references

### Seamless Discovery (`tests/seamless-discovery-workflow.spec.ts`)

- ✅ **End-to-End Flow**: Complete user journey testing
- ✅ **Route Navigation**: Stable URL functionality
- ✅ **State Management**: Watch state persistence
- ✅ **Multiple Scenarios**: Empty state, single/multiple datasets

## Migration from Old Workflow

### Changes Made

1. **Simplified Header**: Removed personalized greeting and action buttons
2. **Clean Layout**: Focus on followed datasets only
3. **Updated Routes**: Changed from `/dataset/{id}` to stable route format
4. **Enhanced Empty State**: Better guidance for dataset discovery

### Backward Compatibility

- **Existing Watches**: User's followed datasets continue to display
- **Data Integrity**: No breaking changes to existing data
- **Smooth Transition**: Users see familiar dataset information

## Potential Issues & Troubleshooting

### 1. Route Not Found
**Symptom**: Clicking dataset cards results in 404
**Solution**: Implement `/area/[areaId]/dataset/[templateId]/page.tsx`

### 2. Database Schema Mismatch
**Symptom**: Queries fail due to missing columns
**Solution**: Run database migration to update schema

### 3. Authentication Issues
**Symptom**: Dashboard not loading for authenticated users
**Solution**: Verify NextAuth configuration and session handling

### 4. Performance Issues
**Symptom**: Slow dashboard loading
**Solution**: Optimize database queries and add caching

## Success Metrics

### User Experience
- **Simplified Interface**: Clean, focused dashboard design
- **Clear Navigation**: Intuitive path to dataset discovery
- **Consistent Behavior**: Predictable interactions and routing

### Technical Performance
- **Efficient Queries**: Optimized database fetching
- **Fast Rendering**: Minimal component complexity
- **Stable Routes**: Reliable URL structure

## Future Considerations

### Potential Enhancements
- **Activity Timeline**: Recent updates from followed datasets
- **Discovery Suggestions**: Recommended datasets based on user interests
- **Enhanced Filtering**: Sort and filter options for followed datasets

### Maintenance
- **Route Stability**: Maintain backward compatibility for stable URLs
- **Performance Monitoring**: Track dashboard load times and user engagement
- **Accessibility**: Ensure continued compliance with React Aria standards

## Related Documentation

- [Seamless Dataset Discovery](./seamless-dataset-discovery.md)
- [Seamless Area Create Epic](../epics/seamless-area-create-epic.md)
- [Dataset Explorer Roadmap](../roadmaps/DATASET_EXPLORER_ROADMAP.md)