# Ideas · Discover / Saved

Design decision (November 2026), based on the approved third and fourth UI concepts. Follow Givvy's existing layout, typography, segmented controls, gift cards and bottom-sheet conventions; the reference images are composition guides, not a replacement design system.

## Two jobs, one Ideas section

- **Discover** is first and is for finding inspiration. Show one visual idea at a time: one large, attractive image, a short, literal object title, and independent **X / Heart** controls. No "A little inspiration" text, purchase prices or embedded filter panel.
- **Saved** is a personal library. Show the existing photo-first Idea/Product component in a two-column grid, including its edit action. Filter by **All** (everything), **Anyone** (unassigned), or a specific person. Do not duplicate FAB creation with a local "Add" button.

## Discover flow

- **Filter button** is separate from the recommendation card. It opens the common bottom sheet. Applied filters are visible above the image as removable chips; an active chip can clear its own filter. Initial proof-of-concept categories are age (Any/Adult/Child) and relationship (Anyone/Close/Acquaintance); taxonomy is provisional and will be expanded after the catalog is designed.
- Each suggestion carries a stable source ID. **Dislike** remembers the ID as skipped and immediately shows the next eligible card. Do not loop four hard-coded recommendations endlessly. Once the current eligible pool is exhausted, show a calm end state with an explicit way to review skipped ideas.
- **Like** opens the standard bottom sheet: **Anyone**, followed by the user's saved people with their existing avatars. No implicit assignment from the Saved tab's person filter. Closing the sheet does not change or save the current card.
- Choosing a recipient creates an independent **Idea**, not a Gift. It is stored in Saved with `personId`, optional `sourceDiscoveryId`, name, image and indicative price. The catalog entry then leaves Discover, including after reloading or switching filters. No purchase states or occasion plans are created.
- The global FAB's **Add gift idea** continues to open the existing editor. Manual ideas are saved to the same library as liked suggestions; the For field includes Anyone or a person. People profiles show those saved ideas using existing filtering.

## First version and future catalog

- The starter library includes four existing photo assets and short, concrete titles: Ceramic mug, Throw blanket, Art book, Scented candle. This is deliberately a design/interaction prototype, not a mature recommendation engine.
- One large high-resolution editorial photo per suggestion in this iteration. Moodboards, richer taxonomy, recommendation personalization, image storage strategy, and larger curated catalogs come later, after this flow is approved.
- The browser backup schema remains version 3, with optional `sourceDiscoveryId`. Existing ideas, event gifts, personal localStorage and backup exports are not modified or cleared.

## Interaction and visual polish

- **Full-bleed precise wave:** Discover and Home share exactly the same SVG path, a controlled asymmetric curved upper edge. A richer pastel gradient fills it from the toolbar down to the viewport bottom, including visible browser UI changes. No gray overlay pseudo-element and no clipping of the filter toolbar or card shadow. The photo-card has breathing room below the wave.
- **Polaroid snapshot:** A centered, smaller floating white card with square 1:1 center-cropped photo (landscape and portrait sources supported), soft radii, raised shadow, equal white mat on three sides and a deeper bottom mat for the short name. The heart/X buttons sit just below the snapshot, never stranded at the foot of the colored field. Its width compresses on short Chrome/Pixel screens instead of forcing page overflow.
- **Gestures:** drag horizontally to rotate and translate the card. Right shows a red heart overlay, then the card flies right and the existing Anyone/person picker opens; cancellation does not save or skip. Left shows a neutral dark X overlay, flies left and persists Skip. Small drags snap back. The Heart control is filled red, the X neutral gray; neither means purchase approval/disapproval. Mouse/touch and accessible button clicks invoke the same actions.
- **FAB:** no creation FAB on Discover; the existing FAB appears on Saved (and all previously approved routes) only.
- **Image quality first:** use four self-contained 1200×1200 high-quality local editorial JPGs for the prototype; optimization/caching strategy is a separate future task.
- **Filters:** monochrome toolbar trigger with four native single-select dropdowns (Age: Any/Adult/Child; Relationship: Anyone/Close person/Friend/Colleague/Acquaintance; Category: Any/Home & living/Books & art; Budget: Any/Under 1,000/1,000–2,000/Over 2,000). Exactly one value per dimension; dimensions combine with AND. Applied chips stay in one horizontally scrollable line, with individual removal. Category and budget are demonstration facets for the four starter items, not a claim of catalog maturity.
- **Notifications:** one shared toast pattern at 12px above the bottom nav, clear of reactions: short successes/info automatically disappear after 3.5 seconds **without an X**; actionable failures/errors **persist with an X** until explicitly dismissed. The caller may override persistence. Success = short; storage failure = persistent. Styling and semantic colors remain shared tokens.
