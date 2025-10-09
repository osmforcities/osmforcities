# OSM for Cities

A web platform to monitor OpenStreetMap datasets at the city level.

## Requirements

- Node.js (see `.nvmrc` for specific version)
- PostgreSQL (running on port 5432)
- pnpm package manager

## Getting Started

### Environment Setup

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Update the following required settings in `.env.local`:

- `DATABASE_URL`: Your PostgreSQL connection string
- `AUTH_SECRET`: A secure random string for session encryption
- `AUTH_URL`: Your application URL
- `CRON_ROUTE_SECRET`: **Generate a new random string** (e.g. with `openssl rand -hex 32`) and use it as your API secret for the cron job

Example to generate a secret:

```bash
openssl rand -hex 32
```

Email configuration:

**For Production:** Postmark credentials are required for magic link authentication
- `POSTMARK_API_TOKEN` - Your Postmark API token
- `POSTMARK_FROM_EMAIL` - Verified sender email (e.g., `noreply@yourdomain.com`)

**For Development:** Postmark is optional
- Without Postmark: Magic links are printed to console (clickable in most terminals)
- With Postmark: Real emails sent (set `EMAIL_FORCE_REAL=true`)
- `EMAIL_DISABLE=true` to disable all email sending

3. (Optional) Add Postmark credentials for email functionality.

### Installation

Install dependencies:

```bash
pnpm install
```

### Database Setup

1. Generate the Prisma client:

```bash
npx prisma generate
```

2. Push the schema to your database:

```bash
npx prisma db push
```

3. (Optional) View your database with Prisma Studio:

```bash
npx prisma studio
```

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

## Tasks API

The application includes a task-based API accessible at `/api/tasks`. Each task has its own dedicated endpoint for executing automated operations.

### Available Tasks

- **send-user-reports**: Sends dataset status reports to users who haven't received one in the last 24 hours
- **update-datasets**: Updates datasets that need refreshing (not yet implemented)

### Usage

```bash
# Send email report
curl -X POST "https://yourdomain.com/api/tasks/send-user-reports" \
  -H "Authorization: Bearer YOUR_CRON_ROUTE_SECRET"

# Update datasets
curl -X POST "https://yourdomain.com/api/tasks/update-datasets" \
  -H "Authorization: Bearer YOUR_CRON_ROUTE_SECRET"
```

## Internationalization (i18n)

This project uses [next-intl](https://next-intl.com/) for internationalization. Translation files are in the `messages/` directory.

### Checking Translations

```bash

pnpm i18n:check

# Check and automatically fix issues (when possible)
pnpm i18n:check:fix
```

The i18n check runs automatically in CI/CD and before commits when translation files are modified.

## Documentation

This project's documentation is an ongoing effort. You can find more detailed information on specific features in the `docs/` directory.

- [Area Search Feature](./docs/features/area-search.md)
- [Translation System](./docs/features/translation-system.md)
- [Design Atlas Integration (UI Library)](./docs/features/design-atlas-integration.md)

### Contributing to Documentation

We welcome improvements to our documentation! If you notice something is missing, unclear, or incorrect, please feel free to open a pull request. To contribute:

1. Create or edit the relevant Markdown file in the `docs/` directory.
2. If you are documenting a new feature, please create a new file in `docs/features/`.
3. Keep the language clear and concise.
4. Submit a pull request with your changes.

## License

MIT
