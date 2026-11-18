# Ideas · Discover / Saved

Design decision (November 2026), based on the approved third and fourth UI concepts. Follow Givvy's existing layout, typography, segmented controls, gift cards and bottom-sheet conventions; the reference images are composition guides, not a replacement design system.

## Two jobs, one Ideas section

- **Discover** is first and is for finding inspiration. Show one visual idea at a time: one large, attractive image, a short, literal object title, and independent **thumbs down / thumbs up** controls. No "A little inspiration" text, purchase prices or embedded filter panel.
- **Saved** is a personal library. Show the existing photo-first Idea/Product component in a two-column grid, including its edit action. Filter by **All** (everything), **Anyone** (unassigned), or a specific person. Do not duplicate FAB creation with a local "Add" button.

## Discover flow

- **Filter button** is separate from the recommendation card. It opens the common bottom sheet. Applied filters are visible above the image as removable chips; an active chip can clear its own filter. Initial proof-of-concept categories are age (Any/Adult/Child) and relationship (Anyone/Close/Acquaintance); taxonomy is provisional and will be expanded after the catalog is designed.
- Each suggestion carries a stable source ID. **Dislike** remembers the ID as skipped and immediately shows the next eligible card. Do not loop four hard-coded recommendations endlessly. Once the current eligible pool is exhausted, show a calm end state with an explicit way to review skipped ideas.
- **Like** opens the standard bottom sheet: **Anyone**, followed by the user's saved people with their existing avatars. No implicit assignment from the Saved tab's person filter. Closing the sheet does not change or save the current card.
- Choosing a recipient creates an independent **Idea**, not a Gift. It is stored in Saved with `personId`, optional `sourceDiscoveryId`, name, image and indicative price. The catalog entry then leaves Discover, including after reloading or switching filters. No purchase states or occasion plans are created.
- The global FAB's **Add gift idea** continues to open the existing editor. Manual ideas are saved to the same library as liked suggestions; the For field includes Anyone or a person. People profiles show those saved ideas using existing filtering.

## First version and future catalog

- The starter library includes four existing photo assets and short, concrete titles: Ceramic mug, Throw blanket, Art book, Scented candle. This is deliberately a design/interaction prototype, not a mature recommendation engine.
- Only one hero image per suggestion in this iteration. Moodboards, richer taxonomy, recommendation personalization, image storage strategy, and larger curated catalogs come later, after this flow is approved.
- The browser backup schema remains version 3, with optional `sourceDiscoveryId`. Existing ideas, event gifts, personal localStorage and backup exports are not modified or cleared.
