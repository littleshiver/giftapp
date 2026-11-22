# Givvy — Empty states
Version 1, November 2026

Empty states are part of the product's information architecture. Do not invent a new component or tone per page. Use `EmptyState` from `src/components/EmptyState.tsx`.

## Scenarios
| State | Appropriate message | Action |
|---|---|---|
| First use: no occasions | What belongs here and why | Create occasion |
| Occasion has no recipients | Whom to invite into this plan | Choose recipients (sheet) |
| No people exist yet | A prerequisite is missing | Add person (opens editor; remembers event) |
| Recipient has no gifts | What to do next | Choose a gift (saved/suggested sheet) |
| One or more gifts already added | Show existing gifts; also offer next step | Add another gift, **never** show zero-content copy |
| No saved ideas for recipient | A specific source is empty, not the whole app | Switch to suggestions or create a gift |
| No service suggestions left | Do not fabricate catalog items | Create custom gift |
| Filter has no matches | Explain filter, not missing data | Reset/show all |
| Loading/error | Not an empty state | Loading and error UI, never call it empty |

## Visual rules
- One soft illustration/icon block, concise **what** heading, optional **why** sentence, maximum one primary plus one secondary action.
- Primary action starts the appropriate flow in-place; use a sheet for picking recipients or gifts rather than routing away from the occasion.
- Compact variant lives inside a person/occasion card; full variant for empty page sections.
- Use Givvy's existing gentle surface and accent palette, not guilt, warning red or a large full-screen takeover.
- Never leave "use the + button" instructions when the + button does not select the context.
- For people and gift photos, offer crop/preview before uploading, preserve originals until Save.
- Empty states are conditionally rendered for **real zero-content states only**; never show while sync is loading or hide a data error.
- In a two-source gift picker, Saved ideas and Givvy suggestions must be visibly separated and must each have their own zero state.
- Translations use `t(en,ru)`; keys and display text belong to the same source of truth.

## Accessibility and mobile
- Descriptive button verbs, proper heading and keyboard-focus order.
- Buttons have 44px minimum tap size and remain above the bottom safe-area.
- A single dialog open at a time; return focus to the initiating action.
- No decorative empty controls that cannot perform the described action.
