## Updating `deno.lock`

Canonical command (run from repo root) to refresh the Deno lockfile after dependency bumps or Supabase function changes:

```bash
deno task lock
```

What it does:
- Caches all Deno entrypoints (`supabase/functions/**/*.ts`, `scripts/**/*.ts`) with `--lock-write`.
- Regenerates `deno.lock` in place so CI (`deno task deno:cache` + `--frozen` checks) stays clean.

Checklist before opening a PR:
- Run `deno task lock`.
- Commit the updated `deno.lock` if it changes.
- Ensure `deno task deno:cache` succeeds (matches CI).
