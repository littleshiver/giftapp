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
- **v1.1 contrast update:** Secondary and Outline control borders use `--control-border #82909c` (3.05:1 vs page gray, 3.27:1 vs white); inputs, radios, and checkboxes use visible non-text borders; placeholders use `--control-placeholder #66717d` (4.81:1 on field background). Disabled controls use explicit ink/fill/border instead of global transparency.
- Bottom idle navigation labels use `--nav-muted #5e6874` (5.66:1 on white), with min 10px at narrow widths; calendar adjacent-month dates use #697580, markers expand from 4px to 6px with stronger color, and selected markers become white. Inactive segmented labels are darker.
- Thin progress segments use `--progress-bought #52705a` and `--progress-planned #7463a0` (4.80:1 and 4.55:1 vs track). These are **data-indicator colors**, not a new purple brand identity.
- The component library now includes a contrast check on a gray background. Continue manual verification on mobile, gradients and user-uploaded images; ratios cover flat CSS colors only.

## Navigation structure

Bottom bar order: **Ideas | People | Home | Events | Settings**. Home is the visually emphasized central tab. Five labels plus uniform icons. Do not put a second Settings button in the Home header. Global circular **FAB** sits above bottom navigation and opens four creation actions: Add gift idea, Add gift to occasion, Add occasion, Add person.

### Home (`/`)

1. Compact brand `Givvy`, brief personal greeting and actual month + year (`November 2026`). **No `N ideas` or `M bought` statistic tiles in the header.** No needless slogan.
2. `Coming up`: horizontally scrollable **compact occasion cards**, displaying a small square cover/image, occasion name, date and a **countdown pill at the top-right**. Partial next card signals scrollability. Sorted chronological, nearest by default selected. Selecting a card updates the focus panel, **does not navigate**.
3. **Focus panel** for selected event: date above title, subtly asymmetric/organic pale top edge, horizontally scrollable **square gift product cards** with uploaded photo or pastel fallback. Each product image has a single top overlay tag: `To buy` or `Bought`, and product name below. A small final `+` tile invokes Add gift with selected event prefilled. **The entire outer focus card opens the occasion details.** Avoid duplicate CTA (`Open gift plan`, arrow button) and generic instructions (`Tap to manage`). In multi-person events, show recipient name near gift name.
4. **Tiny monthly financial strip**, grouped by **occasion date month**. Shows _selected gift costs / allocated event budgets_, and distinguishes bought vs yet to buy via a quiet two-segment progress bar. `Ideas` not assigned to events do not count. A budget of zero is valid and should not cause division by zero. Over-budget amount is a warning, not a blocker.
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

1. No horizontal **page** overflow at 320/375/390/430. Horizontal scroll is allowed _only_ inside clearly intended tracks.
2. No cropped shadows on upper occasion cards, selected focus panel or nav. No overlapping navigation and content at bottom; safe area respected.
3. Coming up horizontally scrolls, nearest event selected by default, tapping a chip updates focus only, tapping focus opens event.
4. No stats chips in Home header, no duplicate action labels/links in focus card.
5. FAB opens creation menu; selected occasion is carried into Add gift; Save persists and updates Home and event detail.
6. Gift can be created/edited with image + price, and toggled To buy ↔ Bought without duplicate statuses.
7. Event budgets and Home monthly strip match and do not count unassigned ideas.
8. Event calendar, planning view, people profiles, idea suggestions, settings, onboarding and bottom sheets all work.
9. Test localStorage upgrade paths and backup restoration against existing React/Stage 1 production data.
10. Run build/typecheck/Playwright on **the React app**, not just this design reference. Submit changes via a PR rather than overwriting `main` unreviewed.


## Visual Fidelity Pass — approved mobile direction (15 Nov 2026)

**Non-negotiable UX:** The 5 tabs (Ideas, People, Home, Events, Settings), FAB, Coming up horizontal scroll, one focused selected occasion, budget strip *after* focused occasion, and Inspiration stay in their existing order. **Never** insert budget under the month or add total Ideas/Bought counters to the Home greeting. No invented dashboard metrics or decorative action buttons.

**Header:** The useful month/year is a quiet 12px dateline; the personalized `Hi, {name} 👋` greeting is the principal 29–34px, weight 900 element. We removed the unapproved bare Givvy logo placeholder; brand mark can be designed later. Ambient gradients are used only as subtle background lighting.

**Type:** Load open-source Nunito (400/500/600/700/800/900) as a real web font with ui-rounded/system fallbacks. Supports multilingual screens; no downloaded font files are included in the handoff. Check font loading on device, including under unreliable connections.

**Occasion cards:** 250px horizontal cards at standard mobile sizes, 232px under 360px. Artwork is 57px, content beside it, countdown tucked in the upper corner. Selected surface is pale cream/sage and uses a quiet neutral outline (not purple-primary). Photos are controlled by user data.

**Focused event:** The top silhouette uses an actual, scalable SVG Bézier wave. The cream-to-sage banner sits behind a large event name, not as a bitmap. Gift thumbnails are square (146px; 133px under 360), horizontally scrollable, with solid Bought / To buy pills and consistent image cropping. The large surface remains one navigable event, and the embedded Add gift is a separate action.

**Palette and depth:** Keep the canvas cold-neutral (#f7f8fa), paper white cards, graphitic controls. Colors are accents and event placeholders only: peach, sage, cream, cloud-blue, rose. Raised cards use soft shadows with sufficient scroll gutter. Preserve v1.1 contrast rules; do not revert to 4px calendar markers, faint input borders or pale secondary buttons.

**All pages:** Reuse Nunito, the same soft surface shadows and radii on calendar, event/person lists, detail headers, idea panel, controls and bottom sheets. This is a styling pass, **not** a data model or navigation refactor. Existing gift states remain only `to_buy` and `bought`.

**Acceptance:** Validate build, Playwright, and real 320/375/390/430px screenshots for Home, Calendar, Event, People, Ideas and Settings; inspect overflow, shadow clipping, cross-browser type fallback, contrast over user photos and reduced-motion behavior. Screenshots from the older handoff are historical references and may not match this pass.


## Filled / empty QA preview + Home visual correction (15 Nov 2026)

- Settings contains **Preview content: My data / Empty / Filled**. Test data lives only in React state and mode selection in `sessionStorage`. It is **not written into `givvy_dashboard_v3`**. Returning to My data restores the actual saved people, events, budgets, images and preferences without importing or deleting anything. Editing while in a sandbox is intentionally temporary. JSON export always uses personal data; JSON import is disabled during sandbox previews.
- Filled mode includes four invented recipients, three occasions, ten sample gifts built using **the exact ten images** supplied in `gift_app_test_product_images_10.zip`. The originals have been resized only for test thumbnails and combined into `src/assets/demo/catalog.webp`, a small 5×2 WebP sprite (five columns, two rows; order matches `image-gen-1..10` and `demoPhotoManifest`). The binary sprite is a normal Vite asset (not a base64/text chunk). React maps `demo-photo:0..9` to those 128px square cells. One additional gift deliberately has no photo to test the fallback. Ideas use existing sample photos. Prices/budgets exercise both under- and over-budget layouts.
- Empty mode has no people, occasions, gifts or ideas, but onboarding is considered complete so all empty states and navigation can be examined.
- **Home visual corrections after mobile review:** `Today · <date>` sits immediately below the prominent greeting, rather than a disconnected small month label above it. The main occasion uses a **single continuous warm peach → white background** behind the wavy SVG, with no 115px hard white seam. Horizontal Upcoming scroller has enough internal gutter to avoid clipping card shadows. Cards use tiered shadows: Upcoming (light), selected occasion (strong), budget (subtle), inspiration (medium), floating navigation (floating/high). Status chips on photographs are fully opaque, high-contrast charcoal Bought and white To buy with a visible outline.
- The core Home order remains greeting → Coming up (horizontal) → selected occasion with square images → small budget helper → Inspiration. Do not insert budget into the header or return rejected counters/decorative product graphics.


## Home visual QA follow-up — 15 November 2026

- **No unrequested date metadata:** Home shows the greeting with a restrained `November 2026` secondary line directly below, not "Today · Sunday…" or an isolated date over the greeting. Month/year is orientation, not a dashboard metric.
- **Occasion palettes must follow selection.** Each Upcoming card has its own explicit accent palette. The selected Upcoming card and the featured occasion surface use the **same** event theme, including the curved SVG gradient. Birthday tones are peach/blush, holidays mint/sky and other celebrations cream/butter/rose. Main controls remain neutral charcoal/white; do not introduce a universal purple primary color.
- **Home status mark:** On Home product images, show a compact black circular check at the **top right only if bought**. No `To buy` overlays or status text on product photos. Full explicit statuses remain available in detail and editing flows.
- **Originals preserved for product QA:** The uploaded 10 photos were originally 1254×1254. The former 128px low-quality atlas was removed; the new `src/assets/demo/catalog-hifi.avif` holds 384×384 image cells (1920×768 overall) from the same originals, with five columns/two rows. This is display-only sample content and does not affect users' saved images.
- **Compositional alignment:** Coming up cards use a real two-row grid (date counter first row; name/date below; icon spans rows) instead of a manually offset label. Featured heading and gift rail have matching inset, truncated titles can wrap to two lines, and partial trailing photos indicate horizontal scrolling. Keep distinct shadows for Upcoming (subtle), featured occasion (strong), budget (flat) and nav (floating). Maintain sufficient scroll gutter for shadows.
- **Acceptance gate:** verify Home at 320/375/390/430px, compare captured Birthday and New Year layouts side by side, ensure no gradient seam, no clipping of prominent shadows, correct checkmark location, AVIF decode and unaffected personal-data persistence. The last step is actual screenshot review, not just green build tests.
