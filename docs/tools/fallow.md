# Fallow (Dead Code Detection)

Run `pnpm fallow` to find unused exports and files.

## Quick Start

```bash
pnpm fallow
pnpm type-check  # verify after cleanup
```

## Safe Cleanup

For each flagged item:

1. **Verify with grep:**
   ```bash
   grep -r "ImportName" src/
   grep -r "fileName" src/
   ```

2. **Check special patterns:**
   - Dynamic imports: `dynamic(() => import('./Component'))`
   - Entry points: `app/layout.tsx`, `pages/_app.tsx`
   - Storybook files: `.stories.ts`, `.stories.tsx`

3. **If truly unused:** delete and type-check
4. **If false positive:** add to `.fallowrc.json`

## Common False Positives

**Framework entry points:**
- `global.ts` - Next.js global types
- `app/layout.tsx` - Root layout
- `middleware.ts` - Request middleware

**Storybook files:**
- `.stories.ts`, `.stories.tsx` - Loaded by Storybook
- `.storybook/` directory

**Library exports:**
- Barrel re-exports: `export * from './Button'`
- Navigation: `useNavigate`, `useRouter`
- Components used in dynamic imports

## Example Cleanup

Typical cleanup session:
- 10-15 files deleted (components, hooks, utilities)
- 15-25 exports removed (barrel exports, unused functions)
- All verified with grep and type-check
- Commit: `chore: remove dead code detected by Fallow`

## When to Run

- Before PRs
- After refactors
- During dedicated cleanup
- Discretionary: whenever you want to check codebase health
