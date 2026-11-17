# Givvy

Mobile-first gift planner built with React, TypeScript and Vite. The approved November 2026 HTML handoff supplies the visual direction: five tabs, a global creation menu, photo-led gifts, independent ideas, occasion budgets, calendar/planning, profiles, local backups and additive onboarding. No backend or authentication.

## Development and validation

Use Node.js 22.12+ and npm (Node 24 is used in CI).

```sh
npm ci
npm run dev
```

Vite development stays at `/` on port 5173. HashRouter routes work on static hosts and in a future WebView. To check production, including the `/giftapp/` base:

```sh
npm run build
npm test
npm run preview
```

Build runs TypeScript checking before Vite. The browser suite starts Vite itself, uses isolated browser storage, and also starts a production preview for the Pages check. Build before tests because the production check uses `dist`.

Cloud checks use `/usr/bin/chromium`; `CHROMIUM_PATH` overrides it. On other machines install the bundled Chromium with `npx playwright install chromium` and use `CI=1 npm test`, or set `CHROMIUM_PATH` to your own executable. CI installs Chromium and its OS dependencies. Tests cover migrations, photos, budgets, independent ideas, editors, navigation, onboarding, backups, invalid/quota-limited storage and 320/375/390/430 px layouts.

## Architecture

- `src/pages`: actual route screens, plus a development-only component library
- `src/components`: shell/navigation, product/occasion/person rows, budget bar, shared sheet/field/button primitives and domain editors
- `src/domain`: current v3 models, original model types, selectors, empty initial state and additive setup logic
- `src/state`: existing React Context for data and transient UI preferences
- `src/persistence`: legacy validation, pure upgrade, versioned load/save/import/export
- `src/utils`: date/currency formatting and image validation/downscaling
- `src/styles`: semantic tokens and approved handoff styles with React/accessibility adaptations
- `src/assets/discovery`: four reference thumbnails for the static discovery deck, inlined so saved images are portable
- `tests/fixtures`: design-review data and occasion pictures used only in isolated test contexts
- `prototype`: unchanged Stage 1 source, kept for history
- `docs/ui-handoff`: approved design system, difference audit, migration plan, QA and screenshots

The component library is at `/#/components` only in development. Onboarding is at `/#/onboarding`; existing users can preview it from Settings. New users can complete it or explore empty screens first. No real user receives the handoff's demo people or plans. Completing a preview adds choices without replacing existing plans. Only initial birthday/holiday occurrences are created; annual recurrence is future work.

## Data preservation and upgrade

The original prototype used unversioned JSON under `givvy_dashboard_v1`; Stage 1 used `{version: 2, data}` under `givvy_dashboard_v2`. Both remain readable. The new UI uses `{version: 3, data}` under **`givvy_dashboard_v3`**. Legacy keys are never rewritten or removed.

| Legacy status | Target                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| `idea`        | Independent idea, with prior association/status retained in provenance |
| `planned`     | Assigned gift: `to_buy`                                                |
| `bought`      | Assigned gift: `bought`                                                |
| `given`       | Assigned gift: `bought`, original `given` retained in provenance       |

Migration is pure and runs in memory. Existing users see an upgrade notice; only an explicit successful save writes v3. The v3 backup contains a full original data snapshot and per-item originals, including photos, links, notes and unknown fields. Settings can also export the original snapshot as a standalone legacy-compatible JSON file. V3 imports round-trip without reapplying the migration. Corrupt/unsupported data is left untouched; writes are blocked pending import recovery. Failed storage writes retain the previous data and open form with an error.

Budgets remain authoritative per event + person. A zero budget is valid, and a blank budget means not set. Both To buy and Bought count once in selected gift cost; independent ideas do not. Monthly totals follow the occasion date, not the date a gift was purchased. Over-budget plans are allowed and marked. Newly saved gifts must name a recipient assigned to the event; inconsistent imported links are retained with repair guidance.

Browser storage is origin-specific. Export from the old origin and import via Settings when moving browsers/hosts. New image uploads are validated and resized to at most 640 px; existing photos are unchanged. Photos/provenance still use quota-limited localStorage. Original-key retention and the upgrade snapshot use additional space, so keep exported backups. There is intentionally no production “reset sample data” action.

## Design review and screenshots

See the updated [People / Events architecture](docs/PEOPLE_EVENTS_ARCHITECTURE.md) for profile and occasion ownership rules.

See [audit and migration decisions](docs/ui-handoff/audit.md), [approved design system](docs/ui-handoff/DESIGN_SYSTEM.md), [QA](docs/ui-handoff/qa.md) and [mobile screenshots](docs/ui-handoff/screenshots/README.md).

To refresh the screenshot artifacts with isolated fixture data:

```sh
CAPTURE_SCREENSHOTS=1 npm test -- tests/visual.spec.ts
```

The static suggestion deck is demonstrative, not personalized. Dark mode, backend sync, full image storage/backup redesign, recurring-event automation and PWA installation remain outside this change. Chromium is covered; physical iOS/Android devices and Safari/Firefox require separate review.

## GitHub Pages and PR checks

Production: **https://littleshiver.github.io/giftapp/**. `vite.config.ts` retains `/giftapp/` for production and preview; `/#/people` becomes `/giftapp/#/people` and refreshes without server rewrites.

`.github/workflows/deploy-pages.yml` remains unchanged: Node 24, locked installation, TypeScript/Vite build, `dist` artifact and official GitHub Pages deployment on pushes to `main`. Pages Source is **GitHub Actions**. The deployment job reports the actual site URL; no PAT or `gh-pages` branch is needed.

`.github/workflows/pr-checks.yml` validates pull requests with build and browser/migration checks and uploads test screenshots. It does **not** deploy. The approved UI is submitted on a feature branch for PR review; merge/deployment is a separate owner decision.
