# Givvy · Design system and screen behavior

Version: **UI direction 1 / November 2026**. Language: English. Intended target width: **390 CSS px**; verify **320, 375, 390, 430 px**. Future: optional WebView/PWA and dark semantic theme.

## Visual direction

Soft, calm but not sterile. Primarily graphite controls and white surfaces, **not** a white-purple identity. Color is a secondary accent for occasion imagery, gift placeholders and subtle atmospheres. Friendly rounded sans-serif typography with strong readability. Avoid decorative gift illustrations, oversized controls, thick outlines and endless sequences of identical gray tiles. Real user-uploaded gift photos are the central visual material.

### Tokens

Source of truth in `styles.css` `:root`:

- Background `--bg #f6f7f8` (light neutral, no yellow parchment)
- Surface `--surface #fff`
- Primary ink `--ink #22252a`; strong ink `--ink-strong #171a1e`
- Secondary `--muted #636975`; subtle text `#79818c`
- Hairline `--line #e9edf0`
- Accent surfaces: blue `#dfeaf7`, lavender `#eee7f5`, sage/mint `#e5f0e8`, butter `#fff0d7`, rose `#f7e7e9`
- Primary action background `--black #23262b`; white text
- Card radius generally 26 px, small tile radius 18 px, input radius 13 px
- Form input min-height 43 px; basic CTA min-height 43 px; circular FAB 58 px
- Use **one** icon system (Lucide in React, 20 px, consistent 1.8 stroke). No disparate icon packs or emojis for UI controls.
- Shadows are intentionally light and **must not be clipped** by horizontal scrolling areas or rounded parents. Horizontal tracks have internal vertical padding and no clipping parent around shadow-bearing cards.

### Forms and interactions

- Inputs and selectors remain compact, not oversized. Native behavior with consistent visual treatment.
- Checkbox: 17x17, filled charcoal with white check on selection. Radio: 17x17 charcoal outer fill/white inner dot.
- Buttons may include leading or trailing icons, but no forced icon requirement. One dominant action per form.
- Add/edit actions open a **bottom sheet** with a grab handle, title, appropriate controls and primary Save CTA.
- Button and text contrast must meet WCAG AA where applicable; keyboard focus visible. `prefers-reduced-motion` respected.

## Navigation structure

Bottom bar order: **Ideas | People | Home | Events | Settings**. Home is the visually emphasized central tab. Five labels plus uniform icons. Do not put a second Settings button in the Home header. Global circular **FAB** sits above bottom navigation and opens four creation actions: Add gift idea, Add gift to occasion, Add occasion, Add person.

### Home (`/`)

1. Compact brand `Givvy`, brief personal greeting and actual month + year (`November 2026`). **No `N ideas` or `M bought` statistic tiles in the header.** No needless slogan.
2. `Coming up`: horizontally scrollable **compact occasion cards**, displaying a small square cover/image, occasion name, date and a **countdown pill at the top-right**. Partial next card signals scrollability. Sorted chronological, nearest by default selected. Selecting a card updates the focus panel, **does not navigate**.
3. **Focus panel** for selected event: date above title, subtly asymmetric/organic pale top edge, horizontally scrollable **square gift product cards** with uploaded photo or pastel fallback. Each product image has a single top overlay tag: `To buy` or `Bought`, and product name below. A small final `+` tile invokes Add gift with selected event prefilled. **The entire outer focus card opens the occasion details.** Avoid duplicate CTA (`Open gift plan`, arrow button) and generic instructions (`Tap to manage`). In multi-person events, show recipient name near gift name.
4. **Tiny monthly financial strip**, grouped by **occasion date month**. Shows *selected gift costs / allocated event budgets*, and distinguishes bought vs yet to buy via a quiet two-segment progress bar. `Ideas` not assigned to events do not count. A budget of zero is valid and should not cause division by zero. Over-budget amount is a warning, not a blocker.
5. `Need inspiration?` banner remains an understated CTA into Ideas.

### Events (`/events`)

A month calendar and a `Planning` view, switchable by a small segmented control. Calendar dots mark dates with events; tapping a date shows its events. Planning view groups upcoming events by occasion month and sums their budgets, linking to event details. This is **not a cashflow calendar**: buying a December gift in November does not imply it is a November event budget.

### Event detail (`/events/:id`)

Event date, name, total event budget vs cost of selected gifts. Recipient list each with their own budget, committed amounts and budget status. Gift gallery/list with one current status per assigned gift, toggled between `To buy` and `Bought`. Add/edit event; add/edit gift via sheets. No `Given`, no additional checklist for wrapping or handing over.

### People (`/people`, `/people/:id`)

People, birthdays (optional), preferences and notes, linked events, gifts and ideas. Person creation and editing via bottom sheet. The data model can later support additional important dates. Do not confuse a person record with a budget: budgets exist in the person/event relationship.

### Ideas (`/ideas`)

Static sample discovery card with Skip/Save; saved idea collection, optionally associated with a person, **not assigned to an occasion** until actively chosen. From an idea editor, `Use for an occasion` opens the gift editor prefilled. Swipe gestures are a future interaction refinement; buttons serve as mobile-accessible fallback.

### Settings (`/settings`)

Account preferences, default birthday budget, access to component reference and onboarding preview, local backup/reset demonstration. Settings stay as the fifth bottom tab.

### Onboarding (`/onboarding`)

Welcome → choose holidays → add person + optional birthday → default birthday budget → finish. Existing users must keep their data; do not silently seed demo people/occasions in production. In the HTML reference, onboarding is previewed from Settings while demo records remain visible for design review.

### Component reference (`/components`, internal only)

Shows tokens, primary/secondary/outline buttons, compact fields, radio/checkbox states, product statuses and bottom sheet. This can be a development-only route in the React implementation.

## Data rules & migration

Current React code has status values `idea`, `planned`, `bought`, `given`. Target UX is:

- `Idea`: separate unassigned saved inspiration item.
- Assigned gift: `to_buy` or `bought` only.
- Transition `to_buy → bought` replaces the label; both remain included in committed event cost. `bought` additionally counts as already purchased.
- For migration: `planned → to_buy`, `bought` and `given → bought`, and `idea` → separate ideas (keeping information, photos, notes, link and any prior association available to support restoration). **Do not implement destructive conversion without first reviewing existing data and migration tests.**

Budget `EventRecipientBudget` must remain `eventId + personId + amount`. The event's budget = sum of its assigned recipient budgets. Gifts assigned to event/person = their actual estimated or purchase amounts; total cost counts `to_buy` and `bought` once each. Ideas not assigned to a specific occasion are ignored. A `0 ₽` limit is valid; an unspecified budget is conceptually distinct from zero and should be modeled if onboarding requires it.

## Component inventory

- App shell / top header / 5-item bottom navigation / global FAB / create menu
- Section heading and optional trailing link
- Upcoming occasion chip (selected/idle, countdown, fallback cover)
- Focus occasion panel with organic header and horizontally scrolling gift products
- Gift product tile (image/fallback, single status label, name, optional person and price)
- Add gift tile
- Compact monthly budget strip and segmented progress
- Inspiration banner
- Calendar month / day / event dot / selected state
- Planning-month summary and event row
- Person row / person avatar
- Event recipient budget row / over-budget warning
- Idea discovery card / Saved idea row
- Sheet framework, input, textarea, select, checkbox, radio, button variants
- Empty state, toast, disabled/focus states

## Proposed QA acceptance checklist

1. No horizontal **page** overflow at 320/375/390/430. Horizontal scroll is allowed *only* inside clearly intended tracks.
2. No cropped shadows on upper occasion cards, selected focus panel or nav. No overlapping navigation and content at bottom; safe area respected.
3. Coming up horizontally scrolls, nearest event selected by default, tapping a chip updates focus only, tapping focus opens event.
4. No stats chips in Home header, no duplicate action labels/links in focus card.
5. FAB opens creation menu; selected occasion is carried into Add gift; Save persists and updates Home and event detail.
6. Gift can be created/edited with image + price, and toggled To buy ↔ Bought without duplicate statuses.
7. Event budgets and Home monthly strip match and do not count unassigned ideas.
8. Event calendar, planning view, people profiles, idea suggestions, settings, onboarding and bottom sheets all work.
9. Test localStorage upgrade paths and backup restoration against existing React/Stage 1 production data.
10. Run build/typecheck/Playwright on **the React app**, not just this design reference. Submit changes via a PR rather than overwriting `main` unreviewed.
