# Kiosk Screensaver — Design

**Date:** 2026-07-08
**Status:** Approved
**Branch:** future-vision

## Overview

An ambient screensaver for the kiosk UI (React + Electron on the Pi
touchscreen). After a period of no touch input it fills the screen with
rotating cards about the animals in the enclosure, keeps the display from
blanking, and still surfaces live status and alerts. Any tap wakes back to
the app exactly where it was left.

## Keep the display awake (OS level)

`ui/start-kiosk.sh` runs before Electron launches:

```
xset s off
xset s noblank
xset -dpms
```

This is what actually prevents the Pi's screen from "going out"; the React
screensaver is what fills it.

## Idle detection

- `useIdle(timeoutMs)` hook in `App.tsx` listening for
  touch/mouse/key/pointer events.
- Default timeout 5 minutes; adjustable in the existing settings dialog and
  stored in `localStorage` (UI-only preference — no API/schema change).
- On timeout, a full-screen `Screensaver` overlay renders above the current
  view. Any interaction unmounts it; the first tap only wakes and does not
  click through to the UI underneath.

## Screensaver content

- **Animal cards** — one full-screen card per animal, rotating every ~25s
  with a slow crossfade. Card contents: Wikipedia photo as a dimmed
  backdrop, animal `name` large, `species` + `species_latin`, `notes`,
  "last fed X hours ago" derived from `last_feeding_log`, and the Wikipedia
  summary paragraph.
- **Single animal** — the card stays up but alternates emphasized detail
  (photo / facts / feeding) on the same cadence, with slight position drift
  to avoid burn-in.
- **No animals** — clock + tank status fallback.
- **Status strip** — persistent slim bar with time, temperature, and water
  level from the existing WebSocket feed. Active alerts (temperature out of
  range, sump `LOCKED_OUT`) replace the strip with a prominent banner; the
  screensaver never hides a problem.

## Wikipedia enrichment (DB + Wikipedia hybrid)

- New `ui/src/dal/Species.dal.ts` fetches
  `https://en.wikipedia.org/api/rest_v1/page/summary/{species_latin || species}`
  once per species.
- Caches `{ title, extract, image }` in `localStorage` for 30 days.
- On lookup failure or offline, the card renders DB-only data — no error
  states on screen.

## Verification (manual, on the Pi)

1. Idle 5 minutes → screensaver appears; display stays lit overnight.
2. Tap wakes to the same view that was open, without triggering a control.
3. Cards rotate through all animals; single-animal enclosure alternates
   detail emphasis.
4. Disconnect network → cards still render from DB + cache.
5. Force a temperature alert (or sump lockout) while the saver is up →
   banner breaks through.
