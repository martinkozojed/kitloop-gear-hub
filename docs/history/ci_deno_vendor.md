# CI Deno Vendor Hygiene

## Rationale

The `esm.sh` CDN has demonstrated instability in content generation for certain packages (specifically `buffer@6.0.3`), returning inconsistent content hashes across different geographical regions and request times. This caused persistent `deno.lock` integrity verification failures in our CI pipeline.

To ensure deterministic and stable builds, we have "vendored" the problematic dependencies directly into this repository.

## Vendored Dependencies

Location: `vendor/esm.sh/`

- `buffer@6.0.3/esnext/buffer.mjs`
- `buffer@6.0.3/esnext/buffer.bundle.mjs`

These files are mapped in `deno.json` via the "imports" map, forcing Deno to use the local versions instead of fetching from the CDN.

## Lockfile Maintenance

The `deno.lock` file is committed and tracked.

- **Normal Usage**: `deno cache --lock=deno.lock ...` will use the lockfile.
- **Permissions**: The `deno:cache` task in `deno.json` includes `--allow-import=deno.land,esm.sh,legacy.esm.sh` to prevent interactive prompts during resolution.

## Updating Vendor Dependencies

If you need to update the vendored `buffer` dependency or add others:

1. **Download** the new file content:

    ```bash
    # Example
    curl -s "https://esm.sh/v135/buffer@6.0.3/esnext/buffer.mjs" > vendor/esm.sh/buffer.mjs
    ```

2. **Update Imports**: If the downloaded file contains relative imports (e.g., `from "/v135/..."`), replace them with absolute URLs (`from "https://esm.sh/v135/..."`) to ensure transitive dependencies resolve correctly without vendoring the entire world.
3. **Update Mapping**: modify the `imports` section in `deno.json`.
4. **Update Imports**: If the downloaded file contains relative imports (e.g., `from "/v135/..."`), replace them with absolute URLs (`from "https://esm.sh/v135/..."`) to ensure transitive dependencies resolve correctly without vendoring the entire world.
5. **Update Mapping**: modify the `imports` section in `deno.json`.
6. **Refresh Lockfile**:

    ```bash
    deno task deno:cache
    ```

7. **Verify**: Ensure `deno.lock` does not contain the remote entry for the vendored file.

## NPM Compatibility Note

For tests or scripts that require Node.js type compatibility (e.g. `supabase-js` which pulls in `@types/node`), use the `npm:` specifier in imports:

```typescript
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
```

This ensures Deno resolves types using the `nodeModulesDir: "auto"` strategy, preventing strict mode type errors.
