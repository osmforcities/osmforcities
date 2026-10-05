# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues in `osmforcities/osmforcities`. Use the `gh` CLI; inside a clone it infers the repo.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with `--label` / `--state` filters.
- **Comment**: `gh issue comment <number> --body "..."`
- **Labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`
- **Blocking edges**: native issue dependencies. `gh api --method POST repos/osmforcities/osmforcities/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where the db id comes from `gh api repos/osmforcities/osmforcities/issues/<n> --jq .id`. A ticket is unblocked when every blocker is closed.
- **Parent/child**: GitHub sub-issues.

Current focus is the open milestone; `priority:` labels rank work within it.

Issue bodies reference other issues and PRs by number (`#80`), never local file paths.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if external PRs should be triaged as feature requests; `/triage` reads this flag.)_

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42`, falling back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
