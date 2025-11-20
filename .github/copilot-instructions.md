# Copilot Instructions for OSM for Cities

This file provides guidance to GitHub Copilot when working on this repository.

## Project Overview

OSM for Cities is a web platform to monitor OpenStreetMap datasets at the city level. It helps users track and analyze OpenStreetMap data quality and coverage for specific geographic areas.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (beta)
- **Internationalization**: next-intl
- **UI Components**: React Aria Components + custom components
- **Styling**: Tailwind CSS 4
- **Maps**: MapLibre GL + react-map-gl
- **Testing**: Playwright for end-to-end tests
- **Package Manager**: pnpm (v10)
- **Linting**: ESLint 9

## Project Structure

```
/
├── .github/           # GitHub configuration (workflows, actions)
├── src/
│   ├── app/          # Next.js App Router pages and API routes
│   │   └── api/      # API endpoints (auth, datasets, tasks, preferences)
│   ├── components/   # React components
│   │   ├── dashboard/  # Dashboard-specific components
│   │   ├── dataset/    # Dataset viewer components including map
│   │   └── ui/         # Reusable UI components
│   ├── lib/          # Utility functions and shared logic
│   │   ├── tasks/    # Background task implementations
│   │   └── geojson/  # GeoJSON utilities
│   ├── hooks/        # Custom React hooks
│   └── types/        # TypeScript type definitions
├── prisma/           # Database schema and migrations
├── tests/            # Playwright end-to-end tests
├── messages/         # i18n translation files (JSON)
├── content/          # MDX content files
├── docs/             # Feature documentation
└── public/           # Static assets
```

## Development Workflow

### Initial Setup

1. **Install dependencies**: `pnpm install`
2. **Generate Prisma Client**: `pnpm prisma generate`
3. **Set up environment**: Copy `.env.example` to `.env.local` and configure:
   - `DATABASE_URL`: PostgreSQL connection string
   - `AUTH_SECRET`: Random string for session encryption
   - `AUTH_URL`: Application URL (http://localhost:3000 for dev)
   - `CRON_ROUTE_SECRET`: Random string for API authentication
   - Email settings (optional for dev, required for production)
4. **Set up database**: `pnpm prisma db push`

### Development Commands

- **Dev server**: `pnpm dev` (starts on http://localhost:3000)
- **Test dev server**: `pnpm dev:test` (with NODE_ENV=test)
- **Build**: `pnpm build`
- **Lint**: `pnpm lint` (fix with `pnpm lint:fix`)
- **Type check**: `pnpm type-check`
- **Tests**: `pnpm test:playwright` (requires test database)
- **i18n check**: `pnpm i18n:check` (fix with `pnpm i18n:check:fix`)

### Testing

- End-to-end tests are in the `tests/` directory using Playwright
- Tests require a PostgreSQL test database configured via `DATABASE_URL` environment variable
- Run tests with `pnpm test:playwright`
- Tests use a special test authentication mode enabled via `ENABLE_TEST_AUTH=true`

## Code Conventions

### General Guidelines

- Follow TypeScript strict mode requirements
- Use functional components with hooks (no class components)
- Prefer named exports over default exports for components
- Use absolute imports with the `@/` path alias for src files
- Keep components small and focused on a single responsibility

### Naming Conventions

- **Components**: PascalCase (e.g., `DatasetCard.tsx`)
- **Utilities/hooks**: camelCase (e.g., `useDataset.ts`)
- **Types**: PascalCase (e.g., `Dataset`, `UserPreferences`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **API routes**: kebab-case directories (e.g., `send-user-reports/`)

### File Organization

- Keep related components, hooks, and utilities close to where they're used
- Place shared/reusable code in appropriate directories (components/ui, lib/, hooks/)
- API routes follow Next.js App Router conventions in `src/app/api/`

### Styling

- Use Tailwind CSS utility classes for styling
- Component-specific styles should use Tailwind's utility classes
- Follow existing patterns for responsive design
- Use CSS variables defined in Tailwind config for theming

### Database & Prisma

- Always generate Prisma Client after schema changes: `pnpm prisma generate`
- Use `pnpm prisma db push` for development schema updates
- Database operations should be in dedicated functions, not inline in components
- Follow existing patterns in `src/lib/` for database operations

### Internationalization

- All user-facing strings must be internationalized using next-intl
- Translation keys are in `messages/*.json` files
- Use the `useTranslations()` hook to access translations
- Run `pnpm i18n:check` to verify translation consistency
- The i18n check runs automatically in CI and pre-commit hooks

### API Routes

- API routes are in `src/app/api/`
- Task endpoints in `/api/tasks/` require Bearer token authentication using `CRON_ROUTE_SECRET`
- Use proper HTTP status codes and error handling
- Validate input with Zod schemas where appropriate

### Authentication

- Uses NextAuth.js v5 (beta) with custom email provider
- Email authentication via magic links (Postmark in production)
- Test mode available via `ENABLE_TEST_AUTH` environment variable
- Session management via Prisma adapter

## Key Features

### Dataset Management

- Users can search for areas (cities, regions) using OpenStreetMap data
- Datasets track OSM data quality and coverage for specific areas
- Users can "watch" datasets to receive notifications
- Dataset refresh functionality updates OSM data

### Dashboard

- Displays watched datasets for authenticated users
- Shows dataset statistics and status
- Provides quick access to dataset details

### Reporting System

- Automated email reports for dataset updates
- Configurable report frequency (daily/weekly)
- Task-based API for background jobs (`/api/tasks/send-user-reports`)

## Documentation

Refer to the `docs/features/` directory for detailed documentation on specific features:

- **Area Search**: `docs/features/area-search.md`
- **Translation System**: `docs/features/translation-system.md`
- **Design System**: `docs/features/design-atlas-integration.md`
- **Dashboard**: `docs/features/dashboard-page.md`
- **Dataset Pages**: `docs/features/dataset-page.md`

## CI/CD

The project uses GitHub Actions for CI/CD:

- **Checks workflow** (`checks.yml`): Runs linting, type checking, and i18n validation
- **Tests workflow** (`tests.yml`): Runs Playwright tests with a PostgreSQL service

Both workflows run on pull requests and pushes to `main` and `develop` branches.

## Common Tasks

### Adding a new page

1. Create route in `src/app/[locale]/` (note the locale dynamic segment)
2. Add translations in `messages/*.json`
3. Update navigation if needed
4. Add tests in `tests/`

### Adding a new API endpoint

1. Create route handler in `src/app/api/`
2. Implement proper error handling and validation
3. Add authentication if needed
4. Update API documentation if endpoint is public

### Modifying database schema

1. Update `prisma/schema.prisma`
2. Run `pnpm prisma generate` to update Prisma Client
3. Run `pnpm prisma db push` to update development database
4. Update seed data if needed (`prisma/seed.ts`)

### Adding translations

1. Add keys to `messages/en.json` (source language)
2. Add corresponding keys to other language files
3. Run `pnpm i18n:check:fix` to validate and fix issues
4. Use `useTranslations()` hook in components

## Best Practices

1. **Always run linting and type checking** before committing code
2. **Write tests** for new features and bug fixes
3. **Keep dependencies up to date** but test thoroughly after updates
4. **Document complex logic** in comments or separate docs
5. **Follow existing patterns** in the codebase for consistency
6. **Handle errors gracefully** with proper user feedback
7. **Optimize for performance** especially for map-related components
8. **Consider accessibility** when building UI components
9. **Test authentication flows** carefully as they use beta features
10. **Validate environment variables** early in the application lifecycle

## Getting Help

- Check existing documentation in `docs/`
- Review similar implementations in the codebase
- Check the README.md for setup and configuration details
- Review CI workflow files for build/test requirements
