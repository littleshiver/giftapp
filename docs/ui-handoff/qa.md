# Approved UI verification

## Checks

- Production build and strict source TypeScript check pass (`npm run build`).
- 23 Playwright checks cover the actual React implementation, including three pure migration checks. No zero-test substitutes.
- Browser checks exercise Home selection without navigation, the whole focus-panel detail action, five-tab order, FAB prefill, idea-to-gift copying, image validation/compression, two-status toggling, recipient membership, zero/absent/over budgets, month accounting, calendar/planning, person preferences/notes, explicit cascade deletion, legacy preservation, backups, quota failures, onboarding, empty states and production hash routes/assets.
- Every screen and editor is checked for page/sheet horizontal overflow at 320/375/390/430 px. The fixture clock is fixed to November 15, 2026. Intended product/occasion tracks scroll horizontally; page-level overflow is forbidden.
- Fourteen screenshots include Home at all four widths and calendar, planning, event/person detail, People, Ideas, Settings, onboarding, development components and a gift editor at 390 px.
- Screenshots use isolated design fixtures. No real browser data, preferences or deployed production data are read or modified.
- Home was visually compared with the supplied `screen-home.png`; spacing, organic focus header, image tiles, shadows, month strip and shell use the reference styles. Lucide replaces the handoff's hand-drawn SVG controls.
- PR CI builds and runs the browser suite using Playwright Chromium on Node 24. The existing main-only Pages deployment and Vite project base are unchanged.

## Scope decisions and limitations

- Current users get an in-memory upgrade notice. The old keys remain unchanged; only a successful explicit save writes v3. See [audit](audit.md) for reviewed risks and original-status preservation.
- Independent Ideas intentionally stop contributing to event costs. Original event links and the `given` status remain recoverable from exported originals/provenance.
- Original snapshots/legacy keys increase localStorage usage; a near-full browser may require exporting backups and explicitly managing storage before saving. The app never silently deletes the source keys or photos to make space.
- The handoff's “reset sample data” is omitted in production to avoid resetting user plans. The internal component reference is development-only and its sample sheet cannot save to application state.
- Onboarding creates explicitly selected initial occasions, not annual recurrence. Hanukkah is retained as a preference because dates vary. Existing plans are not removed when preferences change. New birthdays use the next valid occurrence (including leap-day handling).
- Discovery uses only the four approved sample thumbnails, stored as portable inline images when saved; production starts without demo people, gifts or events. Existing event photos render as supplied; birthdays/occasions without photos use Lucide/pastel fallbacks.
- New uploads are reduced to 640 px JPEG; existing stored images are unchanged. IndexedDB/sync and richer image backup remain future work.
- Chromium mobile viewport testing is complete. Physical devices, iOS Safari, Firefox and assistive-technology review remain manual follow-up; no claim of pixel-identical rendering across platforms.
- The supplied design is implemented on a feature branch. Production changes only after owner review and merge; the PR is not automatically merged.
