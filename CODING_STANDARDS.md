# Coding Standards

How code in this repo should be written. Reviewers (human and agent) check changes against this file. Anything ESLint, TypeScript or Prettier already enforces is not repeated here.

## i18n

- All user-visible text goes through `useTranslations()` / `getTranslations()`. No string literals in JSX, including bare expressions like `{"some text"}` or template literals.
- Translate last. While building, new and changed strings go in `messages/en.json` and the `en` entries of `templates.i18n.yml` only. Once tests pass and the English is final, translate every locale in one commit before review. Re-translate only strings whose English changed after that. A PR merges with every locale complete.
- If `pnpm type-check` fails with `NamespacedMessageKeys` errors after adding keys, delete the stale generated `messages/en.d.json.ts`.
- Exception: dev-only UI that renders nothing outside `NODE_ENV === "development"` (Tune panel, map gallery) may use untranslated English constants, marked `// Dev-only UI, intentionally not translated`. The i18n and Copy rules and the React Aria rule in UI components do not apply to it. Glossary _Avoid_ lists still do.

### Copy

- Changing an existing English string updates every locale in the same PR. A stale translation is worse than a missing one.
- Accessible names (`aria-label`, alt text) and plain-text email parts go through i18n like visible text.
- One term per glossary concept, per locale. Dataset: es _conjunto de datos_, pt-BR _conjunto de dados_, fr _jeu de données_, de _Datensatz_. Template: _plantilla_, _modelo_, _modèle_, _Vorlage_. Area: _área_, _área_, _zone_, _Gebiet_. Save: _guardar_, _salvar_, _enregistrer_, _speichern_. Feature: _elemento_, _elemento_, _élément_, _Objekt_.
- One address form per locale: es _tú_, pt-BR _você_, fr _vous_, de _du_.
- Spanish is Latin American neutral, Portuguese is Brazilian. No regional slang, no English left untranslated. Run `pnpm i18n:review` after changing translations.
- English headings, buttons and labels use sentence case. Other locales never copy English title case, except pt-BR in the next rule.
- Title case exception, in en and pt-BR only: topic and category labels (`CategoryLabel`) and visible nav items (`Navigation`, Sign In and Sign Out included) use title case. Small words stay lowercase unless first: en `and`, `or`, `of`, `for`, `in`, `on`, `the`, `a`, `to`; pt-BR `e`, `ou`, `de`, `do`, `da`, `dos`, `das`, `em`, `no`, `na`, `para`, `o`, `a`. Template names, buttons, headings, descriptions and accessible names (`mainMenu`, `breadcrumbLabel`) keep sentence case. Spanish and French stay sentence case, German capitalizes nouns as usual.
- Full sentences end with a period; headings, labels and buttons do not.
- No punctuation or symbols as keys or baked into labels (`✕`, `(`, `:`, trailing colons, `→`). Components render icons and separators. Exception: parentheses around a value that qualifies a figure in the same message, such as its year (`"Pop. {count} ({year})"`).
- Use ICU placeholders and plurals (`{count, plural, ...}`), never concatenated fragments.
- Plain, accurate copy: no pipeline jargon, no promises the app does not keep, no description repeating its heading.
- Group controls under a heading that names what they affect.
- When the English CTA is first person ("email me"), translations are too ("me avisar", "mich benachrichtigen").

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

Default is no comment. Names, types, tests and ADRs carry meaning; comments rot. Before writing one, classify it:

- Tautology (repeats what the code shows): don't write it. Rename until the code says it.
- Excuse (explains a hack in our code, shortcut, "for now", "temporary", TODO, FIXME): don't write it. Fix the code, or keep it and file an issue. A workaround for an outside bug is a constraint, not an excuse (see below).
- Decision record (a choice that spans files or outlives one change, and its why): write an ADR in [docs/adr/](docs/adr/), not a comment.
- Stale (describes code, behavior or history that no longer holds): delete it when your change touches it.

Allowed, one line each:

- An outside constraint the code can't express (API limit, browser quirk, upstream bug workaround), with the source URL when there is one.
- The why on code a reasonable reader would otherwise "fix" (an odd order, value or extra step). Prefer a test that fails when it is "fixed"; comment only when that test is not cheap.
- Tool directives (`eslint-disable-next-line`, `@ts-expect-error`) with the reason on the same line, the `test.fail()` bug note (see Tests), and the dev-only i18n marker (see i18n).

Never: commented-out code, section banners, JSDoc that restates the signature, changelog-style history ("was X, now Y"), bare issue or PR refs (`#512`, `see #490`: they don't resolve where code is read; use a full URL only if the ticket adds something the comment can't).

Forward-only: existing comments are not swept. A PR that touches a comment in a banned category deletes or moves it.

## Tests

The kind of change decides the test. Commands for each layer are in [AGENTS.md](AGENTS.md).

| Change | Required test |
| --- | --- |
| Pure logic: lib functions, parsers, state transitions, formatting | Unit test (`*.test.ts`) in a `__tests__/` folder |
| API route handler behavior | Unit test of the handler, Prisma and `fetch` mocked |
| Component states and interaction in isolation | Storybook story with an interaction (`play`) test |
| A user flow that crosses client, server, DB or an async lifecycle (dataset create, save, refresh, tiler bake) | Playwright spec in `tests/` |
| Bug fix | Regression test at the lowest layer that reproduces the bug |

- A change can need more than one row: a new tiler state needs a unit test for the transition and a Playwright spec for the flow.
- A known bug the PR does not fix is written as the correct behavior and marked `test.fail()` / `it.fails`, with a comment describing the bug (full issue URL, not a bare ref). The fixing PR removes the marker.
- No test needed for copy-only, styling-only, docs, or config with no behavior.
- Playwright is the most expensive layer: use it only when no cheaper row covers the change, and run it targeted (`--grep`), never the full suite during development.

## Commits and PRs

- Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`). Short, factual, no emojis.
- Issue-closing keywords (`Closes #N`) go in the PR body, never in commit messages.
- PRs target `develop`. `main` is release-only and deploys to production.
- No changesets: `CHANGELOG.md` is written by hand at release time.
