# Event detail — approved product and UI specification (19 November 2026)

## Purpose
An occasion is a place to plan gifts for one or more recipients, edit the event and track **actual spending** against budgets. The calendar only provides navigation, date and event name; shopping status lives on the event itself.

## Shared header / event identity
1. Horizontal full-bleed photographic hero; custom uploaded event image overrides the preset.
2. Back button upper left and Edit button upper right, with the same small white action surfaces as the People profile.
3. Event date over the hero image near the lower right.
4. Event title on a separate raised white card, visually related to the People identity card.
5. A people summary (single birthday person link or overlapping recipient avatars for multi-person).
6. One top-level budget card: bought-only actual spending / total planned event budget, one gray track with lavender progress; do not split this global card by recipients or mix the sum of to-buy gift prices into "spent".

## Single person
The header includes the recipient's profile link (Birthday person for birthday, Recipient otherwise). Below the common budget there is one gift section. A compact All / To buy / Bought filter narrows this recipient's gifts. The person's own budget/spent pair appears in this section, using the person's allocation from the event. Gift cards stay the canonical Product component.

## Multiple people
The header uses overlapping portraits rather than a “4 people” pictogram. Global event budget remains one card; never split its progress at the top.
Below, show independent recipient sections, each with an avatar and name, a **bought-only spent amount / recipient budget**, a local filter All / To buy / Bought and that recipient's gift collection. Changing one filter must not affect any other recipient.

## Gift collection behavior
- **0**: small calm empty text; no duplicate Add CTA (global FAB exists).
- **1–2**: two-column grid; one gift takes one column, no artificial stretching.
- **3+**: independent horizontally swipeable row extending offscreen with a subtle next-card peek; keep inert two-column layout for the smaller sets.
- Status filtering is based on source Gift.status = bought or to_buy, not on a one-time count cached on the Event.
- Invalid recipient assignments continue to surface in Needs attention; do not lose their records.

## Cover presets
Default photo categories (no people, no greetings rendered into images): birthday cake, Christmas/New Year winter room, Hanukkah menorah, cozy romantic evening and generic celebration balloons. Current prototype links to curated Unsplash-licensed images; replace with local optimized copies before offline release.

## Regression criteria
- Personal birthday, group occasion (2 and 4 recipients), no-recipient, empty gifts and 3+ gifts.
- Per-person filters remain independent; global spent equals sum of Gift.price where status is bought only.
- No horizontal *document* scrolling on 320/375/390/430px; gift shelves scroll internally.
- Back and edit stay usable and never overlap date; user-uploaded header image takes priority; gift editor and saved-idea picker still work.
- Default screenshots: Pixel 7a Chrome with browser chrome visible. Run broad regression every 3–5 PRs or after large batches; targeted tests on every PR.

## Backlog outside this redesign
- Dark theme, richer Event image uploads/presets UI and locally bundled marketing photo packs.
- Saved-person chips contrast and Saved library visual iteration remain deferred.
