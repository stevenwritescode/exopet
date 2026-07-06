# Sump Return Pump + Anti-Siphon Main Valve — Design

**Date:** 2026-07-06
**Status:** Approved
**Branch:** future-vision

## Overview

Add support for a sump-based filtration setup: a return pump that moves water
from the sump back up to the display tank, and a motorized ball valve on the
return line that closes whenever the pump is not running to prevent tank water
back-siphoning into the sump.

The valve is a 2-wire auto-return motorized ball valve: energizing the relay
motors it open; de-energizing lets it motor closed. It fails closed on power
loss and takes several seconds (~5–10s) to travel.

## Hardware map

| Line    | BCM | Function                                   | Change                     |
|---------|-----|--------------------------------------------|----------------------------|
| Relay 1 | 26  | Drain pump                                 | unchanged                  |
| Relay 2 | 20  | Fill valve                                 | unchanged                  |
| Relay 3 | 21  | Main valve (energize = open, off = close)  | repurposed from reservoir  |
| Relay 4 | 19  | Sump return pump                           | new                        |
| Input   | 16  | Tank float switch (pull-up)                | unchanged                  |
| Input   | 12  | Sump high-water float switch (pull-up)     | new                        |

- All pins defined as constants in `api/data/common.data.ts` alongside the
  existing ones (`MAIN_VALVE_LINE = RELAY_3_LINE`, `SUMP_PUMP_LINE = 19`,
  `SUMP_FLOAT_SWITCH_LINE = 12`).
- At boot all relays are de-energized: pump off, valve closed — the safe state.
- The sump float switch is polled every 1s, same pattern as the existing tank
  float switch (`pollFloatSwitch`).

### Reservoir feature conflict

Relay 3 previously drove the reservoir valve. With `has_sump` enabled the API
refuses to run a reservoir fill (skips the phase and logs a warning), so a
stale `has_reservoir = true` setting cannot energize the main valve during a
water change.

## Sump state machine (`api/logic/Sump.logic.ts`, `SumpManager`)

States: `STOPPED`, `OPENING_VALVE`, `RUNNING`, `STOPPING`, `LOCKED_OUT`.

- **start()** — refused if a maintenance cycle is active, if locked out, or if
  the sump float reads high. Otherwise: energize valve → broadcast
  `OPENING_VALVE` → after `valve_travel_time` seconds energize pump →
  broadcast `RUNNING`. The pump never runs against a closed or closing valve.
- **stop(reason)** — pump relay off immediately, valve relay off (valve
  auto-closes). State `STOPPING` for one `valve_travel_time`, then `STOPPED`.
  `reason` ∈ `manual | water_change | sump_full | shutdown` and is included in
  the broadcast so clients can explain the stop.
- **Sump-full trip** — sump float goes high → `stop("sump_full")` → state
  `LOCKED_OUT` → Discord notification via existing `Notify.logic.ts`.
- **Lockout reset** — explicit manual action from UI/iOS. Refused while the
  float still reads high. Reset returns state to `STOPPED` (user restarts the
  pump deliberately).
- **Boot autostart** — if `has_sump` and `sump_autostart` are set and the sump
  float is clear, `start()` runs at API startup.
- State is held in memory; boot autostart re-establishes the running state
  after a restart.

## Water-change interlock (`api/logic/Maintenance.logic.ts`)

- Before any drain or water change begins, `SumpManager.stop("water_change")`
  is called and the manager records whether it was running. The drain starts
  immediately — the valve is already closing and finishes travel long before
  the tank level drops below the return outlets.
- When the cycle completes, is cancelled, or is reset, the sump auto-restarts
  if it was running before the cycle.
- Fill-only operations do not require stopping the sump.
- A sump-full trip during a maintenance cycle still triggers lockout and
  suppresses the auto-restart.

## Models (`models/src/System.model.ts`)

- `System.SumpState` enum: `STOPPED = 0`, `OPENING_VALVE = 1`, `RUNNING = 2`,
  `STOPPING = 3`, `LOCKED_OUT = 4`.
- `System.ServiceRequest` additions: `START_SUMP = "start_sump"`,
  `STOP_SUMP = "stop_sump"`, `RESET_SUMP_LOCKOUT = "reset_sump_lockout"`.
- `System.ServiceUpdate` addition: `SUMP_STATE = "sump_state"` with payload
  `{ tank_id, state: SumpState, reason?: string }`.
- `System.ParameterUpdate` addition: `SUMP_WATER_LEVEL = "sump_water_level"`
  with payload `{ tank_id?, sumpFull: boolean }`.
- `System.ParameterCheck` addition: `SUMP_WATER_LEVEL` so clients can query on
  connect.
- `TankSettings` additions: `has_sump?: boolean`,
  `valve_travel_time?: number` (seconds), `sump_autostart?: boolean`.
- iOS ports the same enums/fields in its Swift models.

## API surface

REST (mirroring `/maintenance/*`):

```
GET /sump/start/:tankId   → start sump (409-style refusal if not allowed)
GET /sump/stop/:tankId    → stop sump (reason=manual)
GET /sump/reset/:tankId   → clear lockout (refused if float still high)
GET /sump/status/:tankId  → { state, sumpFull }
```

WebSocket: `start_sump`, `stop_sump`, `reset_sump_lockout` handled in the
`DataManager` switch; `sump_state` and `sump_water_level` broadcast to all
clients on every transition/level change.

## Database migration

`runMigrations()` in `common.data.ts` adds to `tank_settings`:

- `has_sump INTEGER DEFAULT 0`
- `valve_travel_time INTEGER DEFAULT 10`
- `sump_autostart INTEGER DEFAULT 1`

## UI (React kiosk) and iOS

Both apps, following their existing patterns:

- **Tank detail:** a sump card shown when `has_sump` — status label
  (Running / Opening valve… / Stopping… / Stopped / LOCKED OUT — sump full),
  start/stop toggle, and a "Reset lockout" button visible only in
  `LOCKED_OUT`. Toggle disabled while a maintenance cycle runs.
- **Settings:** "Has sump" toggle, valve travel time (seconds), autostart
  toggle. Saved via the existing tank-settings endpoints.
- Live updates via `sump_state` / `sump_water_level` WebSocket messages;
  status queried on connect via `sump_water_level` check and `/sump/status`.

## Error handling

- Sump relay calls are wrapped in try/catch (like `readGpio`) so a GPIO
  failure logs instead of crashing the API, and the API can run off-Pi for
  development.
- `start` refused during any non-IDLE maintenance state; drain/water-change
  always force-stop the sump first.
- Lockout notifications go through the existing Discord webhook with the
  standard cooldown.

## Verification (manual, on the Pi)

1. Enable `has_sump`; confirm relay 4 (pump) only energizes
   `valve_travel_time` seconds after relay 3 (valve) — stopwatch check.
2. Stop the sump; confirm pump drops out immediately and valve de-energizes.
3. Start a water change while the sump runs; confirm sump stops first and
   auto-restarts after the cycle completes; repeat with cancel/reset.
4. Trip the sump float; confirm pump+valve stop, LOCKED OUT shows in UI and
   iOS, Discord message arrives, reset is refused until the float clears.
5. Reboot the Pi; confirm autostart brings the sump up only when the float is
   clear.
6. With `has_sump` on and `has_reservoir` stale-on, run a water change and
   confirm no reservoir phase fires relay 3.
