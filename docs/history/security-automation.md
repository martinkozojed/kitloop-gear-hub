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

### PR4b: Blocking gate
- Dependency Review is now blocking on high+ severity (warn-only removed; still scoped to the PR’s dependency diff).
- What blocks: newly introduced high/critical vulnerabilities in dependency changes.
- What doesn’t block: PRs without dependency changes; existing/out-of-band CVEs outside the diff.
- How to handle findings: prefer upgrade/revert of the offending dependency; avoid disabling the check unless there is a documented, time-bound exception.
- GitHub UI: Settings → Branch protections → Require status checks → add `Dependency Review` (job name) as a required check on the protected branch.

### GitHub UI checklist (manual)
- Repo Settings → Security → enable **Dependabot alerts**.
- Repo Settings → Security → enable **Dependabot security updates** (optional to auto-patch CVEs).
- Branch protection: no blocking rule added in PR4a; revisit in PR4b if you want dependency-review to block merges.

### Where to find it
- Config files live under `.github/`; docs here. No app UI changes.
