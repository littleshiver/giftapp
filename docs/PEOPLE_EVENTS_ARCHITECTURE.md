# Givvy · People / Events architecture

Decision record, 18 November 2026. This document supersedes the People and Event Detail chapters of the older November UI handoff; the other approved design-system and Home decisions remain unchanged.

## Ownership

- **People is memory, not a shopping checklist.** A person owns their name, optional portrait, birthday, interests, wishes/preferences, things to avoid and free-form notes. Their profile shows only **saved gift ideas**. It never shows To buy/Bought states, event budgets or occasion gift history.
- **Ideas are reusable inspiration.** An idea may belong to a person or to Anyone. It holds name, image, link, optional notes and estimated price. The global Ideas area shows the whole library; People filters it by person.
- **Events are concrete occasion plans.** Each event has a date, optional reminder preference, one or more recipients, recipient-specific budgets and selected gifts. This is the only place where purchase state and committed costs live.
- **A gift is not an idea with a different status.** Choosing an idea in an event creates a new gift record with its own name, image, link, price, note and To buy/Bought state. Optional `sourceIdeaId` preserves provenance; editing the gift does not change the idea. Creating a direct gift does not automatically add an idea.

## Screens and interaction

### People list
Compact name/photo or pastel-initials rows, one date subtitle, alphabetical by name. Search only appears once the list is large enough to benefit. Add person uses the existing shared editor sheet.

### Person profile
One identity area (photo, name, birthday, Edit), an **About** card (tags for interests, wishes/preferences, things to avoid, notes) and a **Gift ideas** photo grid. No selected gifts, event groupings or shopping statuses. Add idea preselects the person.

### Event detail
- One recipient: one identity line and a flat gifts area. A birthday always has **one celebrant**. An extra item such as flowers for a child's mother can be named as a gift within that person's birthday; it does not create a second birthday recipient.
- More than one recipient: grouped gifts beneath each person with personal budget context and Add gift action. The number of recipients, rather than solely the event kind, determines the layout.
- Add gift for a known recipient opens the existing bottom sheet with their saved ideas and **Add a new gift**. Selecting an idea pre-fills an editable new gift.
- Missing recipient or occasion associations from legacy records are never silently discarded; Events offers a small **Gifts needing attention** recovery list when needed.

## Birthdays and recurrence

- **Person.birthday is the source of truth**: legacy `YYYY-MM-DD` stays valid; new entries may use `MM-DD` without a birth year.
- People with a known birthday receive a linked birthday occasion automatically; users do not need to enter the same date twice. A new birthday event gets a single `birthdayPersonId` and `people: [person.id]`.
- The upcoming date is calculated from the person's month and day (Feb 29 skips non-leap years).
- A yearly plan is an independent Event record. Historical events and their gifts are retained; old Bought states and prices are not reused.
- A new annual plan defaults to the app's birthday budget and inherits the most recent saved birthday reminder preference. Reminders view lists upcoming occasions, not historical ones. Past years remain accessible in the month calendar.
- Editing a personal date updates an upcoming linked plan where possible. Outdated future plans with **no gifts** are retired. If gifts already exist, preserve those records rather than silently deleting user data.
- New birthday events cannot be created manually in the general occasion editor and gifts cannot add additional recipients to a single birthday. Preexisting inconsistent multi-recipient legacy records are preserved so users do not lose gifts.

## Storage and data integrity

- Remains in local version-3 browser storage / JSON backups; no account, server or push service is introduced.
- Optional person fields: `photo`, `interests`, `avoid`. Existing `likes` remains the free-form preference text, and `note` remains notes; no destructive migrations.
- Portraits are JPEG center-cropped to 256 × 256 before storage, avoiding full-resolution uploads in limited browser storage.
- Optional Event `birthdayPersonId` and Gift `sourceIdeaId` are additive. Old records without them remain valid. Never infer provenance by matching gift names.
- Deleting a person explicitly warns about linked gifts, occasion memberships and unassigned independent ideas.
- All changes are committed via the existing atomic local persistence path and share existing bottom-sheet, status and button components.

## Future (not added in this release)

No universal recurrence engine for every holiday, push delivery backend, cloud sync, shopping history in People, automatic interest-based recommendations or expanded preference forms. Budget visual redesign remains a separate planned review.
