# Screensaver Temperature Overlay — Design

**Date:** 2026-07-28
**Status:** Approved for planning

## Goal

Show per-tank temperature status on the kiosk screensaver so a glance at the
idle display answers: is any tank too hot, too cold, or is a sensor not
reporting? No tank names on the chips — the screensaver video already
identifies the animals.

## Architecture

Three pieces: a new aggregate API endpoint, a shared temperature-status util
in the kiosk UI, and an overlay component inside the existing screensaver.

### 1. API: aggregate temperature endpoint

New route `GET /tank/temperatures` in `api/controllers/Tank.controller.ts`,
registered BEFORE any `/:tankId` route so the literal path is not captured as
a tank id. It calls a new `TankManager.getAllTemperatureStatuses()` in
`api/logic/Tank.logic.ts`:

- Fetch all tanks; keep only tanks with at least one sensor of type
  `Thermometer` (via `SensorDataManager.getSensorsForTank(tankId,
  "Thermometer")`). Tanks without a thermometer are omitted entirely.
- Read each thermometer; compute the average of successful reads.
- Response shape:

```json
{
  "statuses": [
    {
      "tank_id": "uuid",
      "name": "Cosmo's tank",
      "average": 26.1,
      "lower_temp_limit": 24,
      "upper_temp_limit": 28
    }
  ]
}
```

- `average` is Celsius; `null` when zero sensors on that tank produced a
  reading. A `null` average is the per-tank "sensor inactive" signal.
- `lower_temp_limit` / `upper_temp_limit` come from `Tank.settings` (Celsius,
  may be 0/unset — the UI falls back to the same 25/30 defaults `TankTemp`
  uses today).
- Reuses the existing per-tank read path; like the WebSocket path, reads may
  trigger `NotifyManager.checkTemperature` (its 15-minute cooldown already
  rate-limits Discord alerts).

**Drive-by bugfix (in scope):** `GET /tank/:tankId/temperature` currently
contains a stray `return;` inside its sensor loop
(`api/controllers/Tank.controller.ts:107`) that ends the handler without
sending a response whenever a sensor reads successfully. Fix by delegating
the handler to the already-correct `TankManager.getTemperatures(tankId)`.

### 2. Shared temperature-status util

Extract `dangerLevel()` and `temperatureGaugeColor()` from
`ui/src/components/AppBar/TankTemp.tsx` into `ui/src/utils/temperature.ts`,
unchanged. `TankTemp.tsx` imports them from there (zero behavior change).
The overlay uses the same functions so status colors are identical across
the kiosk.

### 3. Screensaver overlay component

New `ui/src/components/TempStatusOverlay.tsx`, rendered inside the
screensaver's full-screen div in `ui/src/components/Screensaver.tsx` — it
mounts only while the saver is active and unmounts when dismissed.

- **Polling:** fetch `GET /tank/temperatures` on mount and every 15 seconds.
- **Chips:** one per status entry. Live chip: `26°C / 79°F` (both units,
  matching `TankTemp`) on a dark translucent pill, text colored by
  `temperatureGaugeColor` with the tank's thresholds. Inactive chip
  (`average: null`): gray text, a thermometer-off glyph, and `—` instead of
  a reading.
- **Burn-in drift:** the chip cluster occupies one corner and moves to the
  next corner (cycling all four) every 2 minutes, animated with a CSS
  transition.
- **Input transparency:** the overlay uses `pointer-events: none`; the
  screensaver's own pointer handler still dismisses on any tap.
- Text sized to be readable from across a room (roughly 1.5rem for the
  temperature line).

## Error handling

- Poll failures (network error, non-200, timeout) never crash or dismiss the
  saver. After 3 consecutive failures (~45s), ALL chips render as inactive
  (gray) — a dead hub looks like dead sensors, which is the correct
  "go look" signal. The next successful poll restores live chips.
- A healthy response with `average: null` for one tank grays only that
  tank's chip.
- An empty `statuses` array renders no chips (no thermometers configured).

## Verification

- Type-check/build both `api/` and `ui/`.
- Manual: run API + kiosk UI locally with a short screensaver timeout prop;
  on a dev Mac, DS18B20 reads fail, exercising the inactive path end-to-end.
  Verify chips appear, corner drift occurs, a tap dismisses the saver, and
  killing the API grays the chips after ~45s.
- Live-reading verification against the real hub on the LAN when available.

## Out of scope

- Editing temperature thresholds from the kiosk UI.
- Showing pH/water level or other parameters on the saver.
- Changing the WebSocket protocol or `TankTemp`'s behavior.
- iOS app changes.
