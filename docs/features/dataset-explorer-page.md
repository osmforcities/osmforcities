# Dataset Explorer Page

## Overview

Dataset explorer page at `/area/{areaId}/dataset/{templateId}` with lazy loading for on-demand dataset creation.

## Route Structure

```text
/area/{areaId}/dataset/{templateId}
```

- `areaId`: OSM relation ID
- `templateId`: Template ID (kebab-case, future CUID support)

## Implementation

### Lazy Loading Flow

1. Validate parameters
2. Check database for existing dataset
3. If not found: create on-demand via Overpass API
4. Render with existing dataset components

### Components Used

- `DatasetMapWrapper`: Interactive map
- `DatasetInfoPanel`: Metadata and stats
- `DatasetStatsTable`: Quality metrics
- `DatasetActionsSection`: Follow/export actions
- `ExplorerLayout`: Responsive layout

### Error Handling

- Template not found
- Area not found  
- Overpass API failures
- Invalid URLs

## Testing Strategy

### Mocking External APIs

Tests use mocks for external dependencies:

- **Overpass API**: Mocked to avoid rate limits and external dependencies
- **Nominatim API**: Mocked for area data fetching
- **Database**: Test database with seeded data

### Test Structure

```typescript
// Use test database with seeded data instead of real API calls
test.beforeEach(async ({ page }) => {
  const prisma = new PrismaClient();
  const user = await createTestUser(prisma);
  
  // Create test data to avoid external API dependencies
  const testArea = await prisma.area.upsert({...});
  const testDataset = await prisma.dataset.create({...});
  
  await setupAuthenticationWithLogin(page, user);
});

// Test error handling and validation
test("should handle template not found", async ({ page }) => {
  await page.goto("/area/298470/dataset/non-existent-template");
  await expect(page.locator("text=Template Not Found")).toBeVisible();
});
```

## Status

✅ **Completed**

- Clean URL structure
- Lazy loading with Overpass integration
- Template ID validation with migration guardrails
- Error handling and loading states
- Test coverage with proper mocking

## Examples

```text
/area/298611/dataset/bicycle-parking    # NYC bicycle parking
/area/62428/dataset/hospitals-all       # Berlin hospitals
```
