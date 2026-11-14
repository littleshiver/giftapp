# Givvy

Mobile-first gift planner. Stage 1 migrates the supplied prototype to React, TypeScript and Vite while retaining its four tabs, calendar, detail pages, editor sheets and light visual direction. No backend or authentication.

## Development

Use Node.js 22.12+ (Node 24 was validated) and npm.

```sh
npm ci
npm run dev
```

Vite serves the application on port 5173. Hash-based routes work on static hosts and are suitable for a future WebView; navigation does not require server rewrites. For a production bundle:

```sh
npm run build
npm run preview
```

## Validation

```sh
npm run typecheck
npm test
```

Browser tests use `/usr/bin/chromium` in this cloud environment. Elsewhere, set `CHROMIUM_PATH` to a Chromium executable, or install Playwright's Chromium with `npx playwright install chromium` and remove the executable-path override in `playwright.config.ts`. Tests start their own Vite server and use isolated browser storage. Coverage includes migration, CRUD/cascade deletion, photos, statuses and budgets, calendar, touch swipes, preferences, import/export, storage errors and navigation at 320/375/390/430 px.

## Structure

- `src/pages`: Home, Events/calendar, People, Ideas, details and Settings
- `src/components`: shared rows, navigation, section headers and editor sheets
- `src/domain`: typed entities, seed data and budget/spending selectors
- `src/state`: React context for application data, transient UI state and save feedback
- `src/persistence`: validated backup parsing, versioned storage and export
- `src/utils`: date/currency formatting (centralized for future localization)
- `src/styles`: semantic light-theme tokens and prototype component styles
- `prototype`: unchanged uploaded HTML and original README for reference
- `docs/audit.md`: source audit, migration decisions and limitations

## Existing data

The prototype stored unversioned JSON under `givvy_dashboard_v1`. Givvy reads this on first use when `givvy_dashboard_v2` is absent. On a successful save it writes `{version: 2, data: ...}` to the new key and leaves the original untouched. Both legacy JSON backups and version 2 backups can be imported. Budgets remain on each event (including zero), and image data, gift statuses, IDs, preferences and unknown fields are preserved.

Browser storage belongs to an origin. Data from an HTML file or another host cannot be read automatically here: export JSON from the prototype and import it through Settings. Invalid/unsupported stored data is left untouched and saves are blocked pending recovery through a valid backup. Import validates before asking to replace data. Full/blocked storage reports a failed save and retains the editor; it does not claim success or discard the last saved state.

## Stage 1 boundaries

Demo recipients and occasions remain explicit prototype samples. Suggestions are a static deck; holiday preferences do not generate events. Birthday recurrence, onboarding, localization UI, dark mode, image compression/backup improvements, PWA installation, sync and authentication are future work. Photos remain inline localStorage data and can exceed browser quota. Keep JSON backups. Stage 1 retains the prototype's visual issues for a later refinement pass, including small secondary text and horizontal-scroll shadows. Chromium was tested; Safari and Firefox were not.

## GitHub Pages

The production site is intended for **https://littleshiver.github.io/giftapp/**.
`vite.config.ts` sets the production/preview base to `/giftapp/` and keeps local
Vite development at `/`. Existing hash routes remain unchanged; for example,
`/giftapp/#/people` can be opened and refreshed directly on Pages.

In the repository's **Settings → Pages → Build and deployment**, set **Source**
to **GitHub Actions**. GitHub Actions must also be enabled under **Settings →
Actions → General**, with the official `actions/*` actions permitted. If the
`github-pages` environment has deployment protection rules, allow `main` and
approve a deployment when required by those rules.

`.github/workflows/deploy-pages.yml` installs the lockfile with Node 24, runs the
TypeScript check and Vite build, uploads only `dist`, and deploys with GitHub's
Pages actions. Every push to `main` (including merged pull requests) deploys;
**Actions → Deploy Givvy to GitHub Pages → Run workflow** can also trigger it.
The deployment job has `pages: write` and `id-token: write` permissions and reports
the actual site URL. No deployment token or `gh-pages` branch is needed.

Private repositories require a GitHub plan that supports Pages for private
repositories. If GitHub says the current plan is ineligible, obtain owner approval
before changing visibility; this setup does not make that change. Standard Pages
sites can be publicly accessible even when the source repository is private.

To validate the production path locally:

```sh
npm run build
npm test
npm run preview
```

Open the preview's `/giftapp/` path. The browser suite includes a production-build
check for asset loading, all four tabs, a direct hash route, editing and reload at
mobile width. To verify a real deployment, check the successful **deploy** job in
GitHub Actions and open its reported URL on your phone. Browser data remains
local to each browser/origin; transfer plans with Settings → Export/Import JSON.
