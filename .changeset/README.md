# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and releases.

## How it works

1. **Develop features** normally without changesets
2. **When ready to release**: Add changesets and run `pnpm release`
3. **Clean merge**: The release is ready to merge to main via PR

## Workflow

### Normal Development

1. **Make changes** to the application
2. **Create PR** for review
3. **Merge when approved**
4. **Repeat** for next feature

### When Ready to Release

1. **Add changesets** for the changes you want to include:

   ```bash
   pnpm changeset
   ```

2. **Select the package** (osmforcities)
3. **Choose version bump** (patch, minor, major)
4. **Write description** of changes
5. **Prepare the release**:

   ```bash
   pnpm release
   ```

   This will:
   - Update the version in package.json
   - Generate/update CHANGELOG.md
   - Stage all changes for commit

6. **Review and commit**:

   ```bash
   git add .
   git commit -m "chore(release): vX.Y.Z"
   git push
   ```

7. **Create PR** to merge to main

## Commands

- `pnpm changeset` - Add a new changeset
- `pnpm release` - Prepare release (version + changelog)
- `pnpm version-packages` - Version packages manually

## Version Bumps

- **patch**: Bug fixes and minor improvements
- **minor**: New features (backward compatible)
- **major**: Breaking changes

## Example Changeset

When you run `pnpm changeset`, you'll create a file like:

```md
---
"osmforcities": patch
---

Fix authentication flow in login component
```

## Example Release Process

```bash
# 1. Normal development (no changesets needed)
git add .
git commit -m "feat: add user authentication"
git push

# 2. When ready to release, add changeset
pnpm changeset

# 3. Prepare the release
pnpm release

# 4. Review changes and commit
git add .
git commit -m "chore(release): v1.0.1"
git push

# 5. Create PR to main
```
