# OSM for Cities

A web platform to monitor OpenStreetMap datasets at the city level.

## Requirements

- Node.js (see `.nvmrc` for specific version)
- PostgreSQL (running on port 5432)
- pnpm, at the version pinned in `package.json` (`packageManager`); pnpm 9.7+ switches to it automatically

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
- With Postmark: Real emails sent automatically
- `EMAIL_DISABLE=true` to disable all email sending

3. (Optional) Add Postmark credentials for email functionality.

### Installation

Install dependencies:

```bash
pnpm install
```

New dependency versions must be older than the cooldown set by `minimumReleaseAge` in `pnpm-workspace.yaml`. For an urgent security fix, skip the cooldown for that one install:

```bash
pnpm add <pkg> --config.minimum-release-age=0
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

### Running the tiler

Dataset maps come from [overpass-pmtiler](https://github.com/osmforcities/overpass-pmtiler), a separate service that fetches each dataset from Overpass, computes its stats and bakes its map archive. The app only runs the count probe and submits the bake. See [ADR 0001](docs/adr/0001-tiler-is-the-only-overpass-data-client.md).

Install:

- Python 3 (no Python packages needed)
- [tippecanoe](https://github.com/felt/tippecanoe), with `tile-join`, on `PATH`
- An Overpass instance with area support, reachable from both the app and the tiler. The public `https://overpass-api.de/api/interpreter` has areas. Keep test areas small on a shared instance.

Start the tiler from its own checkout:

```bash
git clone https://github.com/osmforcities/overpass-pmtiler.git
cd overpass-pmtiler
PMTILER_OVERPASS="<same interpreter URL as the app's OVERPASS_API_URL>" python3 pmtiler.py
```

Unset, the app's `OVERPASS_API_URL` falls back to the instance named in `.env.example`. An Overpass behind a tunnel with a self-signed certificate also needs `PMTILER_INSECURE=1`.

Tiler settings, all optional, defaults in its `config.py`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PMTILER_OVERPASS` | `http://localhost/api/interpreter` | Overpass interpreter URL |
| `PMTILER_INSECURE` | unset | `1` accepts a self-signed certificate, e.g. a tunnel |
| `PMTILER_PORT` | `8099` | Listen port |
| `PMTILER_BIND` | `127.0.0.1` | Listen address. The tiler has no authentication: keep it on localhost |
| `PMTILER_SPOOL` | `spool` | Bake working directory. A large bake can use about 3 GB |
| `PMTILER_MAX_AGE_DAYS` | `7` | Bakes older than this are deleted from the spool |

Then in the app's `.env.local`:

```bash
TILER_URL="http://127.0.0.1:8099"
TILES_DIR="./data/tiles"        # archives the app reconciles and serves. data/ is gitignored
NEXT_PUBLIC_TILES_ENABLED="true" # render maps from the archive
```

Restart `pnpm dev` after changing these. `NEXT_PUBLIC_` values are inlined into the client bundle when it compiles. With `TILER_URL` and the flag both set, every dataset is created and refreshed through the tiler.

Check a bake end to end:

1. `curl http://127.0.0.1:8099/status` returns the tiler version and queue depth.
2. In the app, open a dataset for a small area. The wait page shows the bake stage.
3. [http://127.0.0.1:8099/](http://127.0.0.1:8099/) lists the bake and its stage.
4. When the bake is done, the open wait page reconciles it: the archive lands in `TILES_DIR` and the map shows. With no page open, the `update-datasets` task reconciles it instead (see [Tasks API](#tasks-api)).

The tiler's own options and API: its [README](https://github.com/osmforcities/overpass-pmtiler#readme) and [API.md](https://github.com/osmforcities/overpass-pmtiler/blob/main/API.md).

## Testing

### Where e2e specs go

Playwright has two projects, each with its own dev server:

- `tests/tiler/`: the `tiler` project, against `:3100` with tiles on, a mock tiler and a mock Overpass. Put specs here when they need the tiles lane.
- everything else under `tests/`: the `chromium` project, against `:3000`.

Locally both servers start. In CI each job runs one project and starts only its server (`E2E_PROJECT`), so a spec that reaches the other project's server passes locally and fails in CI. The tiler specs run as one CI job, so a slow new tiler spec makes every PR wait longer.

### Real tiler smoke test

The `tiler` Playwright project runs against a mock tiler. `tests/tiler/smoke.spec.ts` swaps in a real overpass-pmtiler to catch contract drift (job JSON, `stats.json`, archive format). Run it by hand before a release and before changing the tiler contract. CI skips it.

Needs Python 3, `tippecanoe` on `PATH`, an overpass-pmtiler checkout, and the test database on port 5433. The tiler fetches from the app's mock Overpass, which serves the checkout's `fixtures/delft-parks.json`, so no tunnel is needed.

```bash
PMTILER_SMOKE=1 PMTILER_DIR=../overpass-pmtiler pnpm test:playwright tests/tiler/smoke.spec.ts
```

`PMTILER_DIR` is resolved from the app folder. The tiler listens on port 8199, and ports 3000 and 3100 must be free. Run only this spec: with `PMTILER_SMOKE=1` the other tiler specs would talk to the real tiler and fail.

## Tasks API

The application includes a task-based API accessible at `/api/tasks`. Each task has its own dedicated endpoint for executing automated operations.

### Available Tasks

- **send-user-reports**: Sends dataset status reports to users who haven't received one in the last 24 hours
- **update-datasets**: Refreshes datasets that are due and reconciles pending bakes

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

This project uses two translation systems:

1. **UI translations** ([next-intl](https://next-intl.com/)) for interface text in `messages/` directory
2. **Template translations** (database-based) for dataset template names/descriptions

See [docs/features/translation-system.md](./docs/features/translation-system.md) for complete documentation including user preference behavior.

### Checking Translations

```bash
pnpm i18n:check
```

```bash
# Check and automatically fix issues (when possible)
pnpm i18n:check:fix
```

The i18n check runs automatically in CI/CD and before commits when translation files are modified.

## Development Tools

### Fallow (Dead Code Detection)

Run `pnpm fallow` to detect unused exports and files. See [Fallow](docs/tools/fallow.md) for guidance on interpreting results and safe cleanup.

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
