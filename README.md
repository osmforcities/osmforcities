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
- `NEXTAUTH_SECRET`: A secure random string for session encryption
- `NEXTAUTH_URL`: Your application URL (use `http://localhost:3000` for local development)
- `CRON_ROUTE_SECRET`: **Generate a new random string** (e.g. with `openssl rand -hex 32`) and use it as your API secret for the cron job

Example to generate a secret:

```bash
openssl rand -hex 32
```

Optional settings for email functionality:

- AWS SES credentials (`EMAIL_SES_*`) for production email sending
- `EMAIL_FORCE_REAL=true` to send real emails in development
- `EMAIL_DISABLE=true` to disable all email sending

3. (Optional) Add AWS SES credentials for email functionality.

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

## License

MIT
