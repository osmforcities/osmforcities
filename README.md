# Esteva

A web platform to monitor OpenStreetMap datasets.

## Requirements

- Node.js (see `.nvmrc` for specific version)
- PostgreSQL (running on port 5432)
- pnpm package manager

## Getting Started

### Environment Setup

Create a `.env.local` file in the project root:

```env
# Database Connection (PostgreSQL on port 5432)
DATABASE_URL="postgresql://username:password@localhost:5432/esteva?schema=public"

# Authentication
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

Replace `username` and `password` with your PostgreSQL credentials.

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
