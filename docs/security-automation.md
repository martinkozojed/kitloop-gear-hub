## Security automation (PR4a)

### Dependabot
- Config: `.github/dependabot.yml`
  - npm (root) weekly, grouped: `npm-minor-patch` (minor/patch), `npm-major` (major).
  - github-actions weekly, grouped: `gh-actions`.
  - Labels: `dependencies`, `security`; open PR limit: 5.
- To adjust: edit schedule interval, update-types in groups, or `open-pull-requests-limit`.

### Dependency Review workflow
- Workflow: `.github/workflows/dependency-review.yml`
  - Triggers on `pull_request`.
  - Uses `actions/dependency-review-action@v4` with `fail-on-severity: high`, `warn-only: true` (non-blocking gate for PR4a).
- To tighten later: remove `warn-only` or lower severity threshold.

### GitHub UI checklist (manual)
- Repo Settings → Security → enable **Dependabot alerts**.
- Repo Settings → Security → enable **Dependabot security updates** (optional to auto-patch CVEs).
- Branch protection: no blocking rule added in PR4a; revisit in PR4b if you want dependency-review to block merges.

### Where to find it
- Config files live under `.github/`; docs here. No app UI changes.
