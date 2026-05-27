# How to rebuild the `/demo` (vendored app-next build)

`ghostline-research.org/demo/` is served from **`demo-app/`** in this repo — a
*vendored* (committed) static build of **`ghostline-app-next`** (a different repo:
`ghostline-fresh`). The legacy `src/` demo is no longer used for `/demo`.

## Rebuild when app-next changes

1. **Build app-next** (in the `ghostline-fresh` checkout, e.g. `C:\GhostLine`):
   ```bash
   cd C:/GhostLine/ghostline-app-next
   MSYS_NO_PATHCONV=1 VITE_DEMO_MODE=true VITE_BASE=/demo/ npm run build
   ```
   - `VITE_DEMO_MODE=true` → replay-only demo (no live backend).
   - `VITE_BASE=/demo/` → assets resolve under `/demo/`.
   - **`MSYS_NO_PATHCONV=1` is REQUIRED on git-bash/Windows** — without it, MSYS
     mangles `/demo/` into `/Program Files/Git/demo/` and the build is broken.

2. **Vendor the build** into this repo (`GhostLine-Demo`):
   ```bash
   cd C:/GhostLine/worktrees/ghostline-consulting-site
   rm -rf demo-app && cp -r C:/GhostLine/ghostline-app-next/dist demo-app
   git add demo-app && git commit -m "demo: rebuild vendored /demo"
   ```

3. **Deploy** publishes it automatically: `.github/workflows/deploy.yml` does
   `rm -rf dist/demo && cp -r demo-app dist/demo` (master → Pages).

## Notes
- Base-aware recording fetch lives in app-next `src/data.tsx` `loadRecording()`
  (rewrites absolute `/recordings/…` to `${BASE_URL}recordings/…`). Recordings are
  bundled in the build (`demo-app/recordings/`).
- **Verify locally** before merge: serve a dir where `/demo` = `demo-app`, then
  `node C:/GhostLine/tools/shot/verify-demo.mjs http://localhost:PORT/demo/ <out>`.
- Going live = merge `codex/consulting-offer-site` → `master`.
