# Givvy — November 18 design decision / execution plan

Approved in conversation on 18 November 2026. Implement page-by-page, keeping established product architecture and interaction behavior. Source of truth for Discover-specific details: [IDEAS_DISCOVERY.md](IDEAS_DISCOVERY.md).

## PR A — Discover first
- Reuse the *exact* geometrically controlled Home focus wave path as a shared vector. Remove the gray pseudo-element that overlaps the filter toolbar. More legible warm pastel gradient.
- One full-bleed colored surface continuing to the visual viewport bottom, adapting to browser chrome and mobile safe areas. **Not** a fixed-height card that ends early; the frame/photo may adapt to screen height.
- One centered Instax/Polaroid-like floating snapshot: square image with centered cropping of portrait and landscape sources; soft corners and drop shadow; same white frame thickness on three edges, deliberately larger bottom mat with modest title. Do not stretch to the full stage width.
- Leave breathing room above the photo to reveal the wave; position heart and X near the photo, without losing nav/toast clearance on Pixel 7a Chrome or narrow/short phones.
- Leave swipe physics, like/recipient picker, skip persistence, Saved and FAB behavior untouched.
- Toast contract: ephemeral success/info, auto-dismiss without X; actionable/error messages persistent and have X; allow explicit persistence override. Always position consistently above bottom nav.
- Scope: visual and notification changes only. Validate key interactions and 320, 375, 390, 430px mobile breakpoints.

## PR B — Home second
- Shared CountdownBadge used by People and Home, with optional birthday cake icon. Numeric `Xd`, including `0d` (never `Today`), short/localizable. Existing orange urgency tint remains; add red for day zero. People only shows badge for <=30 days; Home shows countdown for upcoming events.
- Coming up cards shorter: occasion illustration on left; date/name vertically centered; badge in a corner never crossing text. Keep approved palettes and occasion art.
- When selected event contains no gifts, Home focus gallery shows a minimal white placeholder matching the product cards' height; succinct copy referring to the global +; no duplicate CTA.
- A horizontal user scroll selects the card nearest the center **when the gesture settles**; taps still select; programmatic centering cannot fight manual scrolling.
- Hi, [name] greeting appears on initial load with small one-shot hand wave. On first meaningful page scroll or navigation, it collapses smoothly, leaving Givvy and Coming up. Do not reappear on client-side return; show on full reload. Respect reduced motion.

## PR C — Demo portraits
- Expand only the demo/preview data, never personal people: a couple children, several older relatives, other ages and relationships. Comparable head-and-shoulder framing, but informal real-life locations (home, garden, café, etc), eye-lines and subtle pose variety. Preserve some entries without photos to demonstrate optionality.
- Reuse image/avatar architecture with no changes to persistent saved data.

## Later
- Saved person chip contrast and saved idea collection redesign — explicitly deferred.
- Richer demo image-less fallbacks — deferred.

## QA cadence
- Run targeted build and interaction/migration checks on every PR.
- Run broad regression every 3–5 PRs or immediately after a large batch. Test Android Pixel 7a Chrome with browser controls visible, plus automated 320/375/390/430px widths; review Safari/physical devices where available.
