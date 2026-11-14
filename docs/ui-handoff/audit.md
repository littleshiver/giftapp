# Approved UI migration: audit and plan

The supplied November 2026 HTML/CSS/JS reference is the visual and interaction authority. React, TypeScript, Context, HashRouter, the persistence adapter and GitHub Pages remain the implementation architecture. This work goes through a PR, not main or a production deployment.

## Differences and decisions

| Area      | Current production                                   | Approved target                                                                                                                     |
| --------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Shell     | Four tabs, profile Settings                          | Ideas / People / Home / Events / Settings; 58px create menu FAB                                                                     |
| Home      | Large greeting, navigation chips, hero CTA and stats | Compact brand/month, selection-only upcoming cards, whole-panel detail link, photo-first square gift track, tiny month budget strip |
| Events    | Calendar and flat list                               | Calendar and Planning grouped by occasion month                                                                                     |
| Gifts     | idea / planned / bought / given in one collection    | Independent Ideas; assigned gifts To buy / Bought only                                                                              |
| Forms     | Bottom sheets, large fields, no association check    | Shared accessible sheets, compact fields, validate recipient membership before saving                                               |
| People    | Birthday, notes, gifts                               | Add preferences, independent ideas, maintain linked occasions                                                                       |
| Settings  | Budgets, holidays, backup                            | Add name, onboarding preview; component reference is development-only; preserve holiday preferences/backups                         |
| First run | Automatic sample people and events                   | Empty data, Welcome → holidays → person/birthday → birthday budget → finish                                                         |
| Images    | Inline data URLs                                     | Preserve existing photos; validate and downsize new uploads; user photos remain primary                                             |

Production records must not be replaced by handoff demo records. Only the approved static discovery deck uses bundled sample thumbnails. In automated screenshots the fixture is isolated from real browser storage. No new backend, recurrence engine, dark mode, auth or dependencies are included.

## Non-destructive migration and reviewed risks

- Read v1 unversioned and v2 wrapped data with nested validation. Use a new `givvy_dashboard_v3` key; never rewrite or remove v1/v2 during migration.
- `planned → to_buy`, `bought → bought`, `given → bought`. Keep the entire original record in per-record provenance, including given status and unknown fields.
- `idea → ideas` with all fields retained, including optional person, original event and original status in provenance. Ideas no longer count against event budgets; this is an intentional accounting change in the approved design.
- Preserve a full original source snapshot in the v3 upgrade provenance and export. Backups therefore remain independently recoverable, including unknown top-level fields. Migrating in memory does not write until an explicit save; display an upgrade notice to existing users.
- Reject unknown versions/corrupt data without overwrite. A migration must be idempotent; importing v3 must not transform records again. Legacy keys have lower priority than a valid v3 snapshot.
- Preserve inconsistent imported relationships without deleting them. Surface repair guidance and reject newly saved gifts with invalid event/person membership. Event edits may not remove a recipient who has assigned gifts until those gifts are reassigned/deleted explicitly.
- Zero budget is valid; absence remains distinct and does not silently become zero in stored data. Event totals sum assigned-recipient budgets only. Costs count each assigned gift once, grouped by event date month; overspend is visible, never a save blocker.
- Quota failures leave both previous storage and visible state intact; retain form input for retry/export. Provenance duplicates data and may increase quota usage, so export/recovery stays available.
- Existing users do not enter onboarding automatically. Preview is additive and does not reset data. New first runs have no placeholder records. Holiday generation creates only explicit selected occasions; annual recurrence remains out of scope.

## Reviewable commits and checks

1. Audit / reference documentation.
2. Additive v3 migration with tests; semantic tokens and reusable UI primitives.
3. Shell, Home, Events/detail, People, Ideas, editors and Settings; browser regression checks.
4. Additive onboarding / empty states.
5. Final E2E, responsive screenshots, production-base build, PR CI.

Before release, tests cover every legacy status, notes/links/photos/unknown fields, original snapshots, zero/absent budgets, invalid associations, corrupt/unsupported backups and round trips. The PR is the review gate for enabling the new schema in production; it will not be merged automatically.
