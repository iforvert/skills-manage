# User Testing

## Validation Surface

**Primary surface:** Tauri v2 desktop app webview, accessible at `http://localhost:1420` during `pnpm tauri dev`.

**Testing tool:** `agent-browser` — connects to the Vite dev server URL to interact with the React UI.

**Setup requirements:**
1. `pnpm tauri dev` must be running (starts both Vite and Tauri)
2. Wait for the webview to load at localhost:1420
3. The scanner runs automatically on startup — wait for sidebar to populate before testing
4. If port `1420` is already occupied by another local dev server, start Tauri with a merged config override on another allowed port in `1420-1430` (for example `pnpm tauri dev -c '{"build":{"beforeDevCommand":"pnpm exec vite --port 1422","devUrl":"http://localhost:1422"}}'`) and point validators at that port.

**Known constraints:**
- Tauri file dialogs (import/export) cannot be tested via agent-browser; test the underlying logic via the UI state changes instead.
- Symlink creation requires actual filesystem access — tests should use a controlled test fixture directory.
- Opening the dev URL in a regular browser does **not** expose Tauri globals (`window.__TAURI__` / `window.__TAURI_INTERNALS__` stay undefined), so Tauri-backed state may appear incomplete there. For those cases, validate the native `skills-manage` window itself and capture evidence via macOS window screenshots.

## Validation Concurrency

**Machine:** macOS, 48 GB RAM, 12 CPU cores.

**agent-browser surface:**
- Tauri dev server: ~200 MB RAM
- Each agent-browser instance: ~300 MB RAM
- Available headroom (70% of free): ~29 GB
- **Max concurrent validators: 5**

## Flow Validator Guidance: agent-browser

- Use the shared dev server at `http://localhost:1420`.
- For user-testing validation, run the app with `HOME=/tmp/skills-manage-test-fixtures/foundation-home` so scanning uses an isolated fixture home instead of the real user home.
- Stay within that fixture home and the assigned evidence/output directories; do not inspect or modify real `~/.*skills/` directories.
- The foundation sidebar assertions share one startup scan and one backing SQLite DB under the isolated HOME, so run them in a single validator rather than concurrent validators.
- If the browser preview does not reflect Tauri state, use the native `skills-manage` window as the real user surface and capture the window with a Quartz-based screenshot for evidence.
