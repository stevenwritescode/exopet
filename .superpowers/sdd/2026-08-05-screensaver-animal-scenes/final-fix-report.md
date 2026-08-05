# Screensaver Animal Scenes — Final Fix Wave Report

**Date:** 2026-08-05
**Branch:** future-vision
**Author:** Claude Fable 5 (automated fix wave)

---

## Summary

Four issues resolved across the kiosk screensaver feature. All tests pass (37/37), `tsc --noEmit` clean in both ui and api, services redeployed and confirmed live.

---

## Fix 1 — Lockout banner staleness (must-fix)

**Files changed:**
- `ui/src/components/Screensaver.tsx`

**Problem:** The sump lockout banner only reacted to `sump_state` WS broadcasts (state transitions). A kiosk that started during an already-active lockout would show no banner because the initial `checkSumpLevel` call (which replies with `sump_water_level`) was never being made, and `sump_water_level` messages were not handled in the message switch.

**Fix:**
1. Added `checkSumpLevel` to the import from `../dal/Maintenance.dal`.
2. In the `active`-branch of the `useEffect([active])`, added `checkSumpLevel({})` immediately after `getAnimals()`. This fires every time the screensaver activates, so the lockout flag is always fresh from SumpManager's current state.
3. Extended the WS message handler to also match `System.ParameterUpdate.SUMP_WATER_LEVEL` and call `setSumpLockedOut(msg.data.state === System.SumpState.LOCKED_OUT)` — but only when `msg.data?.state !== undefined`, so background float polls (which omit `state`) do not interfere.

---

## Fix 2 — Screensaver.test.tsx: new sump_water_level lockout test

**Files changed:**
- `ui/src/components/Screensaver.test.tsx`

**Changes:**
- Added `checkSumpLevel: jest.fn()` to the Maintenance.dal mock and its `beforeEach` re-application so existing tests continue to work with the new import.
- Added new test: `"shows the lockout banner when a sump_water_level reply with state 4 arrives on activation"` — activates the saver, drives the captured WS handler with a `sump_water_level` event carrying `state: 4` (LOCKED_OUT), asserts the banner appears; then sends a float-poll reply (no `state` field) and asserts the banner does **not** clear.

---

## Fix 3 — AnimalCardScene.tsx: remove unnecessary cast (trivial)

**Files changed:**
- `ui/src/components/AnimalCardScene.tsx`

**Change:** `(animal as any).image_url` → `animal.image_url`. `image_url` is typed on the `Animal` class in aquario-models, so the cast was both unnecessary and obscured the type.

---

## Fix 4 — getAllAnimals: enrich with last_feeding_log (spec gap)

**Files changed:**
- `api/data/Animal.data.ts`

**Problem:** `AnimalDataManager.getAllAnimals()` was a bare `SELECT * FROM animals`. The `last_feeding_log` field consumed by `AnimalCardScene` (and `AnimalList`) was always `undefined`, so "Last fed X ago" never rendered on the screensaver cards.

**Fix:** Replaced the bare SELECT with a LEFT JOIN correlated subquery that picks the single most-recent `action_type = 'Feeding'` log for each animal. The join columns (`fl_timestamp`, `fl_action_type`, `fl_log_json`) are assembled into the typed `last_feeding_log` shape `{ log_type, timestamp, log_json }` and the flat columns are deleted before the object is returned. All existing consumers receive the same shape; the change is purely additive.

**Verified live:**
```
curl -s http://exopet-api.local:3001/animal/all
```
Both Cosmo and Echo now include `last_feeding_log` with `log_type: "Feeding"`, `timestamp`, and `log_json: { food_type, quantity }`.

---

## Fix 5 — Spec amendments (bookkeeping)

**Files changed:**
- `docs/superpowers/specs/2026-07-08-kiosk-screensaver-design.md`

Appended an "Amendments" section recording two post-implementation user decisions:

(a) The saver alternates the existing 90 s video loop with the animal card scene (25 s/animal): video → cards → video → …

(b) Single-animal enclosures show a static card between video scenes rather than alternating emphasised detail — intentional simplification.

---

## Verification

| Check | Result |
|---|---|
| `CI=true npx react-scripts test --watchAll=false` (ui) | 37/37 PASS |
| `npx tsc --noEmit` (ui) | clean |
| `npx tsc --noEmit` (api) | clean |
| `scp` ui/src/components/* → exopet-ui.local | OK |
| `scp` api/data/Animal.data.ts → exopet-api.local | OK |
| `systemctl restart exopet-kiosk.service` | OK — "No issues found" |
| `systemctl restart exopet.service` | OK — health + ping traffic visible |
| `curl http://exopet-api.local:3001/_health` | `{"success":true,...}` |
| `curl http://exopet-api.local:3001/animal/all` | Both animals include `last_feeding_log` |

---

## Concerns

None. The ESLint warning in AnimalCardScene (`react-hooks/exhaustive-deps` on the species-lookup effect) pre-existed this change and is intentional design (the effect keys on `animal.id`, not on species strings, to avoid re-fetching when the same animal's species field changes during edit). It was not introduced by this fix wave.
