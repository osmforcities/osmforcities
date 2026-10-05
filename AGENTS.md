# OSM for Cities app

Next.js 15 + React 19 app that turns OpenStreetMap data into city datasets people can explore, save and follow.

## Commands

```bash
pnpm dev                 # dev server
pnpm type-check
pnpm lint
pnpm test:unit           # vitest
pnpm test-storybook      # Storybook interaction tests
pnpm storybook
NODE_ENV=test pnpm playwright test --grep "name"   # targeted e2e only
```

## Rules

- [CODING_STANDARDS.md](CODING_STANDARDS.md): how code here is written. Reviews check against it.
- [docs/glossary.md](docs/glossary.md): domain vocabulary. [docs/adr/](docs/adr/): binding decisions.
- Branch from `develop`, PR into `develop`. `main` is release-only.

## Agent skills

### Issue tracker

GitHub issues in `osmforcities/osmforcities`, blocking edges as native dependencies. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical defaults (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: glossary `docs/glossary.md`, ADRs `docs/adr/`, root `CONTEXT.md` is a pointer. See `docs/agents/domain.md`.
