## Updating `deno.lock`

Canonical command (run from repo root) to refresh the Deno lockfile after dependency bumps or Supabase function changes:

```bash
deno task lock
```

What it does:
- Caches all Deno entrypoints (`supabase/functions/**/*.ts`, `scripts/**/*.ts`) with `--lock` (no `--frozen`), updating `deno.lock` in place.
- Keeps CI (`deno task deno:cache` + `--frozen` checks) clean by ensuring the lock matches imports.

Checklist before opening a PR:
- Run `deno task lock`.
- Commit the updated `deno.lock` if it changes.
- Ensure `deno task deno:cache` succeeds (matches CI).
