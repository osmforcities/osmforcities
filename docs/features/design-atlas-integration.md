# Design Atlas Integration

## Overview

OSM for Cities uses the **Design Atlas** design system for consistent UI components. Design Atlas is in ongoing development - we encourage contributing stable components back upstream.

## Integration

- **Colors**: Integrated into `src/app/globals.css`
- **Components**: Located in `src/components/ui/`
- **Design System**: Sibling `design-atlas/` directory

## Available Components

### Link Component

```tsx
<Link href="https://example.com">External Link</Link>
<Link href="/internal">Internal Link</Link>
```

### Color Classes

```tsx
<div className="bg-olive-100 text-olive-700">  // Primary
<div className="bg-blue-500 text-white">     // Secondary  
<a className="text-link hover:text-link-active"> // Links
```

## Standards

1. Links not underlined by default, underlined on hover
2. External links include external link icon
3. Use Design Atlas colors, not arbitrary colors
4. Follow established component patterns

## Contributing

When developing components:

1. Implement in `src/components/ui/`
2. Follow Design Atlas patterns
3. Consider contributing stable components back to Design Atlas
