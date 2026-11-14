# Prototype audit and Stage 1 decisions

## Implemented source behavior

The source is a self-contained HTML/CSS/JavaScript application. Home displays upcoming enabled occasions, next occasion, this-month budgets and bought/given totals, readiness and discovery entry. Events has Monday-first calendar navigation, adjacent-month dates, event dots, selected-day and list views, details and per-recipient budgets. People supports details, birthdays and notes, associated occasions and gifts. Ideas has seven static suggestions with left/right touch gestures and buttons, person selection and saved gifts. Profile opens Settings rather than a fifth tab.

Person, occasion and gift sheets support add/edit/delete, with confirmation and cascade removal of dependent records. Gift fields include person, event, price, idea/planned/bought/given status, URL, photo and notes. Settings supports the birthday default, Christmas/Hanukkah flags and JSON import/export. Photos use FileReader data URLs with a 6 MB input limit. Suggestion saving requires a selected person and assigns the first chronologically sorted associated occasion.

## State and persistence

All domain state lived in one mutable object. Navigation, subpage, modal, calendar, selection and suggestion state were globals. Rendering replaced the DOM through HTML strings and document-level event delegation. The storage key is `givvy_dashboard_v1`, with `people`, `events`, `gifts`, `settings` and `skipped`. Events contain recipient IDs and a budget map, supporting different budgets for one person across events. Idea prices do not count as committed spending; planned, bought and given prices do. Only bought and given count as purchased.

The prototype resets unreadable/invalid collections to sample data and performs only top-level import validation. It can show save-success messages after localStorage fails. Images embedded through HTML strings create an additional injection risk for imported content. Stage 1 uses React rendering, validates nested data, retains the old key and makes saves transactional: state changes only after the new snapshot is written successfully. Corrupt/unknown-version storage is never silently replaced by demo data. No automatic pruning or relationship repair deletes imported records.

## Simulated or incomplete features

The sample people, birthday and New Year are demo content. Birthday fields do not generate recurring events. Holiday toggles save preferences only; neither Christmas nor variable-date Hanukkah is generated. The suggestion deck is static, cycles in memory and is not personalized. Skipped IDs are an unused compatibility field. Gift links and person notes are editable fields, not separate linked detail screens. No accounts, sync, push notifications, image compression, multi-currency, PWA or dark theme exist.

## Architecture

React Context owns domain state and transient calendar/suggestion preferences. React Router hash routes represent the approved pages and detail screens; editor sheets stay transient. Small shared components cover repeated navigation, rows, lists and headings. Domain types model Person, Event, Gift and EventRecipientBudget; the last has a typed selector over the compatible event budget map rather than a second writable source of truth. Persistence is behind a small adapter for future storage replacement. Date/currency formatting is centralized; semantic theme tokens reserve a future dark-theme boundary without implementing it.

The original CSS, component geometry, gradients, demo data and screen order are retained. Lucide replaces control/navigation glyphs. React-specific link/button styles, dialog labels, keyboard focus/Escape handling and narrow-width safeguards support the migration. No onboarding or Stage 2 redesign was added.

## Risks and limits

localStorage is origin-specific, synchronous and quota-limited. Export/import is necessary across origins. The legacy key remains available as a safety copy and uses additional quota until the user chooses to manage it. Backups are plain local JSON containing personal details and photos. Disabling browser storage prevents saving. Recurrence, image storage, timezone/locale preferences and proper first-run onboarding remain future work. Existing small typography, light contrast and clipped scroll shadows await the approved visual refinement stage.
