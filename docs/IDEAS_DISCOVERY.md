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

- **Single warm surface:** restore the original Discover pastel gradient around the photo, concise title and both reaction buttons; keep Filters separate above it. The stage's photo height adapts to short mobile screens so the actions stay clear of the fixed bottom navigation.
- **Gestures:** drag horizontally to rotate and translate the card. Right shows a green overlay + heart, then the card flies right and the existing Anyone/person picker opens; cancellation does not save or skip. Left shows red overlay + X, flies left and persists Skip. Small drags snap back. Mouse/touch and accessible button clicks invoke the same actions.
- **FAB:** no creation FAB on Discover; the existing FAB appears on Saved (and all previously approved routes) only.
- **Image quality first:** use four self-contained 1200×1200 high-quality local editorial JPGs for the prototype; optimization/caching strategy is a separate future task.
- **Filters:** monochrome toolbar trigger; two native expandable dropdown groups with independent checkbox selection (OR within each facet, AND across facets). Each active selection creates a removable chip above the colored stage. Taxonomy remains deliberately small.
- **Notifications:** one reusable floating toast, success/error/info variants with icon and optional dismiss button; it lives above the bottom nav, away from the main FAB. Successful discovery saves are Success, blocked storage failures are Error. No permanent notification cards in the Discover layout.
