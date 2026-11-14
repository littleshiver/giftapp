# Givvy — mobile-first gift planner prototype

## What is included
- Home: upcoming occasions, next event, monthly budget and gift readiness
- Events: month calendar (Monday-first), event markers, selected-date events, list mode, occasion details
- People: editable recipients, birthdays, gift lists
- Ideas: gift suggestions (swipe left/right or buttons), saved ideas, gift editor
- Settings: birthday budget, holiday preferences, local backup export and import
- Gifts: price in RUB, status, optional image upload, notes and link

## Running the prototype
Unzip and open `index.html` in Chrome, Safari or another recent browser. No build process, backend or external assets are required. Browser data is stored using localStorage. You may need to use a static host rather than a ChatGPT HTML preview.

## Prototype data
Two sample recipients (Friend A and Friend B), one example birthday dated 14 days after the current date and a New Year occasion dated December 31 of the current year. These are demo placeholders, not inferred birthdays or real gift plans. Budget defaults are illustrative except the 10,000 RUB birthday budget specified by the user.

## Known limitations
- No sync between devices, accounts, push reminders, or recurring date automation yet.
- Christmas setting is a preference and does not automatically create an occasion. Hanukkah dates must be entered as custom occasions; holiday dates vary by year.
- Images are stored inline in localStorage; large/many photos may exceed browser quota. Export a backup regularly.
- Suggestion deck is a static sample (not AI-personalized).
- Light theme only; dark theme to follow.
- Currency is RUB only in this prototype.
- JavaScript syntax was checked, but browser end-to-end testing was blocked by the execution environment.

## Proposed next iterations
- Persist annual birthday occurrences (including recurring events)
- Gift status filters and clear spending vs. ideas separation
- Holidays by locale, calendar month indicators and start-week preferences
- Multi-currency, image compression, storage/sync and offline PWA capabilities
