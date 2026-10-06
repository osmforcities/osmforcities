# Domain Docs

How the engineering skills should consume this repo's domain documentation.

Layout: **single-context**. The root `CONTEXT.md` is a pointer only.

## Before exploring, read these

- **`docs/glossary.md`**: the domain vocabulary, one line per term (`**Term**: definition. _Avoid:_ a, b.`).
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.
- **`CODING_STANDARDS.md`**: how code here is written.

If a file doesn't exist, proceed silently. New terms go in `docs/glossary.md` and new ADRs in `docs/adr/NNNN-slug.md`; never create a second glossary in `CONTEXT.md`.

## Use the glossary's vocabulary

When output names a domain concept (issue title, refactor proposal, hypothesis, test name), use the glossary term. Don't drift to the synonyms it lists under _Avoid_.

A concept missing from the glossary is a signal: either the language is invented (reconsider) or there is a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0001 (tiler is the only Overpass data client), but worth reopening because…_
