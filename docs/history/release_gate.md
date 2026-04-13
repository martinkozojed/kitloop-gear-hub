# Release Gate

To ensure stability and prevent regressions, all changes must pass the **Release Gate** before being deployed.

## 🚀 How to Run locally

Run this script before pushing any code:

```bash
./scripts/release_gate.sh
```

This script will automatically:

1. **Check Environment**: Verifies `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist.
2. **Install/Verify**: Ensures dependencies are up to date (`npm install`).
3. **Lint**: Runs ESLint to catch code quality issues.
4. **Typecheck**: Runs TypeScript compiler to catch type errors.
5. **Build**: Verifies the application builds for production.

---

## 🔑 Environment Guidelines

- **Vite Priority**: `.env.local` overrides `.env`.
- **Restart Required**: After changing `.env` files, **always restart `npm run dev`**.
- **API Keys**: Frontend must use `ANON` or `PUBLIC` keys. **NEVER use `SERVICE_ROLE_KEY`**.
- **Netlify**: When environment variables or auth logic changes, use **"Clear cache and deploy site"**.

---

## 💨 Smoke Test Checklist (Manual)

Perform these steps to verify critical paths on Local and Production:

1. [ ] **Clear State**: Run `localStorage.removeItem('kitloop-auth-token')` in console.
2. [ ] **Login**: Sign in with a valid account. Verify no freeze/hang.
3. [ ] **Access Protected Route**: Navigate to `/provider/dashboard`.
4. [ ] **Refresh**: Perform a hard refresh (Cmd+Shift+R) on the dashboard. Verify session verifies.
5. [ ] **Logout**: Click Logout. Verify redirection to `/login`.
6. [ ] **Security Check**: Try accessing `/provider/dashboard` after logout. Verify redirect to login.
7. [ ] **Console Check**: Verify NO `401 Invalid API key` errors and NO `Profile fetch timeout` errors.

---

## 🤖 CI Integration

The release gate runs automatically on Pull Requests via GitHub Actions.
It skips the environment check in CI to avoid secret exposure.

> [!NOTE]
> **Linting Policy**: In CI, linting is configured to be **non-blocking** (`LINT_WARN_ONLY=true`) to accommodate existing technical debt. However, **Typecheck** and **Build** are strictly blocking and must pass.
