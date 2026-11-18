# Givvy · People / Events architecture

Decision record, 18 November 2026. This document supersedes the People and Event Detail chapters of the older November UI handoff; the other approved design-system and Home decisions remain unchanged.

## Ownership

- **People is memory, not a shopping checklist.** A person owns their name, optional portrait, birthday, interests, wishes/preferences, things to avoid and free-form notes. Their profile holds **saved gift ideas** and a read-only historical view of gifts from past occasions. Live shopping states, controls and budgets remain owned by Events.
- **Ideas are reusable inspiration.** An idea may belong to a person or to Anyone. It holds name, image, link, optional notes and estimated price. The global Ideas area shows the whole library; People filters it by person.
- **Events are concrete occasion plans.** Each event has a date, optional reminder preference, one or more recipients, recipient-specific budgets and selected gifts. This is the only place where purchase state and committed costs live.
- **A gift is not an idea with a different status.** Choosing an idea in an event creates a new gift record with its own name, image, link, price, note and To buy/Bought state. Optional `sourceIdeaId` preserves provenance; editing the gift does not change the idea. Creating a direct gift does not automatically add an idea.

## Screens and interaction

### People list
A three-column portrait gallery (or pastel initials), ordered by the next birthday; name/date are consistent below each photo and a compact cake/countdown badge appears for birthdays in the next 30 days. Search only appears for genuinely large lists. Add person uses the shared FAB/editor sheet.

### Person profile
Full-bleed square photo with one arrow-only Back control, one Pencil edit action and a centered birthday badge above the overlapping white identity panel. The panel has a name and stacked Good gifts / Avoid gifting notes. Underneath, a segmented **Gift ideas / Gifted** collection: ideas remain independent and unpurchased, while Gifted shows historical gifts only.

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
- Newly uploaded portraits are JPEG center-cropped to 640 × 640 (quality 0.8) for crisp full-width mobile rendering. Old stored images are left untouched.
- Optional Event `birthdayPersonId` and Gift `sourceIdeaId` are additive. Old records without them remain valid. Never infer provenance by matching gift names.
- Deleting a person explicitly warns about linked gifts, occasion memberships and unassigned independent ideas.
- All changes are committed via the existing atomic local persistence path and share existing bottom-sheet, status and button components.

## Future (not added in this release)

No universal recurrence engine for every holiday, push delivery backend, cloud sync, explicit delivered-on status or gift-delivery timestamp, automatic interest-based recommendations or expanded preference forms. Budget visual redesign remains a separate planned review.

## UI component contract (design-system refresh, November 2026)

- **One reusable Product / Gift Card.** Gift and Idea cards share square photography, type, radius and interactions in Events, People and picker surfaces. Home uses the approved image-only reminder mode without price or edit, and the Gifted history uses event/date as its caption.
- **One purchase-status language:** Bought = green check on a pale green tile. To buy = basket on a pale yellow tile. Status is a separate tappable button in the same top-left position across gift cards; accessible names and `aria-pressed` carry semantics. No duplicate status labels or second status button below the gift.
- **Editing is separate:** a white pencil control on the top-right of the image opens the existing editor sheet; the larger image/title area can also open the item, but status toggles never open the editor. Idea cards omit purchase status entirely.
- **Root navigation:** People, Ideas, Events and Settings have one page title, no decorative `GIVVY` overline. Internal pages have a single Back pattern and a content-first title/identity. Home retains its approved greeting and brand layout.
- **Person Avatar:** one portrait/cropped-image and stable pastel-initial fallback component at sizes appropriate to each context, instead of per-page fallback mechanics.
- **Grouping:** single-person occasions show one flat gift collection; group occasions have recipient headers separated with quiet rules, avoiding a stack of nested white cards. Saved-idea choice reuses the same visual card within the shared bottom sheet.
- **Design boundaries:** Calendar, Reminders, the Home header/motion and budget calculations are unchanged. Do not introduce a new card or icon action when a shared component fits.

## Gifted history (November 2026)

- **Derived, not stored:** a gift is displayed as Gifted for its recipient when `gift.status === "bought"` and the linked event date is strictly before today's local date. Bought gifts for today or future occasions, or gifts still marked To buy, do not appear. This is a pragmatic assumption, not confirmation that a gift was handed over.
- The Gifted segment is ordered by occasion date descending. Each card retains the standard gift presentation and Pencil edit action, shows the occasion/date caption, and has a noninteractive Bought indicator to avoid accidentally removing history while browsing.
- Open the shared gift editor to change the record or delete it with the normal confirmation. Changing status or date updates history automatically, without migrating or duplicating gift records; saved gift ideas remain independent.
- **Navigation:** all routed detail screens use one arrow-only Back primitive. The full-bleed person detail removes the generic 26px top inset. Cake icons get optical stroke alignment without changing their layout boxes.
