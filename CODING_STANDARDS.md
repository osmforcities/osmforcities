# Coding Standards

How code in this repo should be written. Reviewers (human and agent) check changes against this file. Anything ESLint, TypeScript or Prettier already enforces is not repeated here.

## i18n

- All user-visible text goes through `useTranslations()` / `getTranslations()`. No string literals in JSX, including bare expressions like `{"some text"}` or template literals.
- Every new key exists in `messages/en.json`. Other locales may lag; English is the source.
- If `pnpm type-check` fails with `NamespacedMessageKeys` errors after adding keys, delete the stale generated `messages/en.d.json.ts`.

## Navigation

- Import `Link`, `useRouter`, `usePathname` and `redirect` from `@/i18n/navigation`, never from `next/link` or `next/navigation`. The i18n wrappers keep the locale prefix.

## Server and client components

- Server components do not use `useState`, `useEffect` or event handlers.
- Any file using client-side APIs starts with `'use client'`.
- Async server components that fetch data have a Suspense boundary with a fallback in their parent.

## Caching

- Every page and data-fetching server component states its cache strategy explicitly: `export const revalidate = N`, `next: { revalidate: N }` on `fetch()`, or an intentional `export const dynamic = 'force-dynamic'`. Never rely on the silent default.
- `cache: 'no-store'` only for data that is genuinely real-time.

## Overpass

- Every call to Overpass is wrapped in error handling. A failed Overpass call never crashes a server-component render; it degrades to an error or empty state.

## UI components

- New components use React Aria and the design system tokens (colors, spacing). No raw hex colors or one-off spacing when a token exists.
- Existing Radix components stay until they are significantly modified; do not migrate them as a side effect.
- Interactive elements have an accessible name (visible label or `aria-label`) and stay keyboard operable. See the accessibility requirements: WCAG 2.2 AA, full RTL, keyboard navigation.

## Vocabulary

- Name things with the terms in [docs/glossary.md](docs/glossary.md). Respect its _Avoid_ lists in code, tests, commits and UI copy.
- Decisions in [docs/adr/](docs/adr/) are binding until superseded. A change that contradicts one says so explicitly.

## Comments

- Comments explain why, not what. No bare issue or PR refs (`#512`, `see #490`): they don't resolve where code is read. State the reason; use a full URL only if the ticket adds something the comment can't.

## Tests

- Prefer unit (`pnpm test:unit`) and Storybook interaction tests (`pnpm test-storybook`).
- Playwright is expensive: add an end-to-end test only for a flow nothing cheaper can cover, and run it targeted (`--grep`), never the full suite during development.

## Commits and PRs

- Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`). Short, factual, no emojis.
- PRs target `develop`. `main` is release-only and deploys to production.
- No changesets: `CHANGELOG.md` is written by hand at release time.
