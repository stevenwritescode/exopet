# Sump Tank Entity — Design Spec

> **Date:** 2026-07-27
> **Status:** Approved
> **Relation:** supersedes the `has_sump` settings-flag portion of
> `2026-07-06-sump-pump-main-valve-design.md`; that spec's control logic
> (state machine, interlocks) remains future work and will target this
> entity.

## Purpose

A sump is a real tank: it has a name, water, and its own sensors. Model it
as a first-class `Tank` linked to the display tank it serves, manageable
from iOS, displayed read-only on the kiosk.

## Data model (`models/src/Tank.model.ts` + Swift `Tank.swift`)

- `role?: "display" | "sump"` — default `"display"`.
- `parent_tank_id?: string` — set on a sump; the display tank it serves.

SQLite migration (existing `runMigrations()` in `api/data/common.data.ts`):

```sql
ALTER TABLE tanks ADD COLUMN role TEXT DEFAULT 'display';
ALTER TABLE tanks ADD COLUMN parent_tank_id TEXT;
```

Sensors need no changes: a sump has its own `tank_id`, so
`getSensorsForTank(sumpId, "Thermometer")` works as-is.

## API (`api/controllers/Tank.controller.ts`, `api/data/Tank.data.ts`)

- `POST /tank/add` — accepts `role` and `parent_tank_id`; the INSERT in
  `TankDataManager.addTank` must include the new columns (and `id`, if it
  has the same stale-column bug the animals INSERT had — verify).
- **New** `POST /tank/:tankId/update` — whitelist update mirroring the
  animal update endpoint. Allowed columns: `name`, `type`, `role`,
  `parent_tank_id`. Returns the updated tank.
- Connect = `POST /tank/:sumpId/update` with
  `{ role: "sump", parent_tank_id: <displayId> }`.
  Disconnect = `{ role: "display", parent_tank_id: null }`.
- Validation (in the update handler, 400/409 with a reason message):
  - a tank cannot be its own parent;
  - `parent_tank_id` must reference an existing tank whose role is
    `display` (no sump chains);
  - a sump already linked to a different display tank is refused until
    disconnected.
- `GET /tank/all` — returns new columns.
- `GET /tank/:tankId` — response gains `sump`: the tank whose
  `parent_tank_id` = this id (or `null`).

## iOS (management surface)

- `Tank.swift`: add `role` / `parent_tank_id` (string-or-int-safe
  decoding, same pattern as other ids).
- **Tank list:** hide `role == "sump"` tanks from the top level; show a
  nested row (indented, "Sump" badge) under their display tank.
- **Tank detail — Sump card:**
  - No sump: "Add Sump" (prompts for a name → creates the tank with
    `role: "sump"`, `parent_tank_id` set, same water `type` as parent)
    and "Connect Existing" (picker of unlinked display-role tanks
    eligible to become sumps).
  - Connected: sump name, its temperature when it has a probe
    (`/tank/:sumpId/temperature`), "Disconnect" action.
- API calls via existing `APIService` request helpers.

## Kiosk UI (display only)

- `TankList.tsx`: exclude sumps from the main grid; under each display
  tank card with a sump, show "Sump: <name>".
- `TankDetail.tsx`: read-only sump line — name + temperature when
  available. No create/connect controls.

## Error handling

- Validation failures return 4xx with `{ error: <reason> }`; clients
  surface the message.
- Migration is additive; existing tanks read as `role = 'display'`.

## Verification

- `npx tsc --noEmit` clean in `models`, `ui`; API type-check via models
  rebuild; iOS builds via `xcodebuild`.
- Curl-level checks against the API: add sump, connect, refuse
  self-parent, refuse sump-of-sump, refuse double-link, disconnect.
- Live: create a real sump for the Axolotl Tank on the hub; kiosk shows
  it nested; iOS shows the sump card after rebuild.

## Out of scope

Sump pump/valve control logic (July 6 spec), future-vision
`plumbing_circuits`, additional roles (refugium, frag) — the `role`
field leaves room.
