# Sump Pump + Anti-Siphon Main Valve Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Control a sump return pump and a fail-closed motorized ball valve on the return line, with anti-siphon interlocks (valve closed whenever the pump is off, sump paused during drain/water-change, sump-full lockout with Discord alert), controllable from the kiosk UI and iOS.

**Architecture:** A new `SumpManager` (`api/logic/Sump.logic.ts`) owns a five-state machine (`STOPPED → OPENING_VALVE → RUNNING → STOPPING → STOPPED`, plus `LOCKED_OUT`). It drives two relays via new GPIO constants and is invoked from REST endpoints, WebSocket actions, maintenance interlocks, a sump float-switch poller, and boot autostart. "Sump enabled" means the display tank has a linked `role: "sump"` tank (the July 27 sump-entity feature) — there is no `has_sump` flag. Clients render state from `sump_state` broadcasts.

**Tech Stack:** TypeScript (Express/SQLite API on the hub Pi, shared `aquario-models`, CRA kiosk UI), Swift/SwiftUI (iOS), GPIO via `gpioset`/`gpioget`.

## Global Constraints

- Specs: `docs/superpowers/specs/2026-07-06-sump-pump-main-valve-design.md` as amended by `docs/superpowers/specs/2026-07-27-sump-tank-entity-design.md` (sump = linked Tank entity; no `has_sump` setting).
- The API has no test framework — verification is `npx tsc --noEmit` (models/api/ui), models rebuild, curl checks against the live hub, and `xcodebuild` for iOS.
- Node 20 required for builds: `export PATH=/Users/unknower/.nvm/versions/node/v20.20.2/bin:$PATH`.
- Deploys: scp changed files to `exopet@exopet-api.local:~/exopet/...` (hub) and `exopet@exopet-ui.local:~/exopet/...` (kiosk) with `sshpass -p exopet`, then restart `exopet.service` / `exopet-kiosk.service` (`echo exopet | sudo -S systemctl restart <svc>`). Sync `models/lib` whenever models change.
- GPIO pins (BCM): `SUMP_PUMP_LINE = 19` (relay board ch4), `MAIN_VALVE_LINE = RELAY_3_LINE` (= 21, repurposed reservoir channel), `SUMP_FLOAT_SWITCH_LINE = 12` (matches HAT FLOAT2). Relays are active-low. The valve is a 2-wire auto-return motorized ball valve: energize = motors open, de-energize = motors closed, fails closed.
- New `tank_settings` columns exactly: `valve_travel_time INTEGER DEFAULT 10` (seconds), `sump_autostart INTEGER DEFAULT 1`.
- Sump stop reasons exactly: `"manual" | "water_change" | "sump_full" | "shutdown"`.
- Sump start/reset refusal messages exactly: `"sump is locked out — reset required"`, `"sump float reads full"`, `"maintenance cycle in progress"`, `"no sump connected to this tank"`, `"sump is not locked out"`, `"sump float still reads full"`.
- The pump relay must NEVER energize before the valve's travel time has elapsed, and must always de-energize before (or at the same moment as) the valve relay.

---

### Task 1: Models — sump enums and settings (TS + Swift)

**Files:**
- Modify: `models/src/System.model.ts`
- Modify: `models/src/Tank.model.ts`
- Modify: `ios/ExoPet/ExoPet/Models/SystemEnums.swift`
- Modify: `ios/ExoPet/ExoPet/Models/Tank.swift` (TankSettings struct, if it enumerates fields)

**Interfaces:**
- Produces (TS): `System.SumpState` (`STOPPED=0, OPENING_VALVE=1, RUNNING=2, STOPPING=3, LOCKED_OUT=4`); `System.ServiceRequest.START_SUMP="start_sump" | STOP_SUMP="stop_sump" | RESET_SUMP_LOCKOUT="reset_sump_lockout"`; `System.ServiceUpdate.SUMP_STATE="sump_state"`; `System.ParameterUpdate.SUMP_WATER_LEVEL="sump_water_level"`; `System.ParameterCheck.SUMP_WATER_LEVEL="sump_water_level"`; `TankSettings.valve_travel_time?: number`, `TankSettings.sump_autostart?: boolean`.
- Produces (Swift): `SumpState: Int` enum with the same raw values; `ServiceRequest.startSump/.stopSump/.resetSumpLockout`; `ServiceUpdate.sumpState`; the parameter-action enum gains `sumpWaterLevel = "sump_water_level"`.

- [ ] **Step 1:** In `models/src/System.model.ts` inside `namespace System`, add after the `State` enum:

```ts
  export enum SumpState {
    STOPPED,
    OPENING_VALVE,
    RUNNING,
    STOPPING,
    LOCKED_OUT,
  }
```

Add to `ParameterUpdate`: `SUMP_WATER_LEVEL = "sump_water_level",`. Add to `ParameterCheck`: `SUMP_WATER_LEVEL = "sump_water_level",`. Add to `ServiceUpdate`: `SUMP_STATE = "sump_state",`. Add to `ServiceRequest`:

```ts
    START_SUMP = "start_sump",
    STOP_SUMP = "stop_sump",
    RESET_SUMP_LOCKOUT = "reset_sump_lockout",
```

- [ ] **Step 2:** In `models/src/Tank.model.ts`, add to the `TankSettings` interface:

```ts
  valve_travel_time?: number;
  sump_autostart?: boolean;
```

- [ ] **Step 3:** Rebuild models: `cd models && npm run build`. Verify: `grep SUMP_STATE lib/System.model.d.ts` and `grep valve_travel_time lib/Tank.model.d.ts` both hit. `npx tsc --noEmit` in `models` passes.
- [ ] **Step 4:** In `ios/ExoPet/ExoPet/Models/SystemEnums.swift`, add:

```swift
enum SumpState: Int, Codable {
    case stopped = 0
    case openingValve = 1
    case running = 2
    case stopping = 3
    case lockedOut = 4
}
```

Extend `ServiceRequest` with `case startSump = "start_sump"`, `case stopSump = "stop_sump"`, `case resetSumpLockout = "reset_sump_lockout"`. Extend `ServiceUpdate` with `case sumpState = "sump_state"`. Extend the parameter enum used in `handleWSMessage` (named `ParameterAction`; verify the exact name in the file) with `case sumpWaterLevel = "sump_water_level"`.

- [ ] **Step 5:** In `ios/ExoPet/ExoPet/Models/Tank.swift`, if `TankSettings` enumerates fields explicitly, add `var valve_travel_time: Int?` and `var sump_autostart: Bool?` (decode with `decodeIfPresent`; `sump_autostart` arrives as SQLite 0/1 — if other booleans in the struct use an int-to-bool bridge, use the same).
- [ ] **Step 6:** Commit: `"Add sump state enums and settings to shared models (TS + Swift)"`

---

### Task 2: API — GPIO constants, safe relay wrappers, sump float polling, migration

**Files:**
- Modify: `api/data/common.data.ts`
- Modify: `api/data/Tank.data.ts`

**Interfaces:**
- Consumes: Task 1 model enums (`System.ParameterUpdate.SUMP_WATER_LEVEL`).
- Produces: `SUMP_PUMP_LINE = 19`, `MAIN_VALVE_LINE` (alias of `RELAY_3_LINE`), `SUMP_FLOAT_SWITCH_LINE = 12`, `safeRelayOn(line): boolean`, `safeRelayOff(line): boolean` — all exported from `common.data.ts`. Sump float polling calls `SumpManager.onSumpLevelChange(sumpFull)` (defined in Task 3) and broadcasts `sump_water_level`. `tank_settings` gains `valve_travel_time`/`sump_autostart`; `getTankData`/`getTankSettings` normalize `sump_autostart` to boolean.

- [ ] **Step 1:** In `api/data/common.data.ts`, under the existing GPIO line constants (after `FLOAT_SWITCH_LINE`), add:

```ts
// Sump hardware — relay 3 is repurposed as the anti-siphon main valve
// (2-wire auto-return motorized ball valve: energize = open, off = close).
export const MAIN_VALVE_LINE = RELAY_3_LINE;
export const SUMP_PUMP_LINE = 19;
export const SUMP_FLOAT_SWITCH_LINE = 12;
```

- [ ] **Step 2:** Below `relayOff`, add non-throwing wrappers (GPIO failures must not crash the sump state machine, and the API must run off-Pi for development):

```ts
export function safeRelayOn(line: number): boolean {
  try {
    relayOn(line);
    return true;
  } catch (e) {
    console.error(`Failed to energize GPIO ${line}:`, e);
    return false;
  }
}

export function safeRelayOff(line: number): boolean {
  try {
    relayOff(line);
    return true;
  } catch (e) {
    console.error(`Failed to de-energize GPIO ${line}:`, e);
    return false;
  }
}
```

- [ ] **Step 3:** Add a sump float poller below `pollFloatSwitch` (same shape; `SumpManager` is required lazily to avoid an import cycle at module load):

```ts
function pollSumpFloatSwitch() {
  let lastValue = readGpio(SUMP_FLOAT_SWITCH_LINE);
  setInterval(() => {
    const value = readGpio(SUMP_FLOAT_SWITCH_LINE);
    if (value !== lastValue) {
      lastValue = value;
      const sumpFull = value === 1;
      const { SumpManager } = require("../logic/Sump.logic");
      SumpManager.onSumpLevelChange(sumpFull);
      DataManager.send({
        action: System.ParameterUpdate.SUMP_WATER_LEVEL,
        data: { sumpFull },
      });
    }
  }, 1000);
}
```

- [ ] **Step 4:** In `initGpio()`: add `initGpioLine(SUMP_PUMP_LINE, "op");` alongside the other relay inits, `initGpioLine(SUMP_FLOAT_SWITCH_LINE, "ip_pu");` next to the float switch, `relayOff(SUMP_PUMP_LINE);` alongside the other relay-off calls (boot-safe: pump off, valve closed), and `pollSumpFloatSwitch();` after `pollFloatSwitch();`.
- [ ] **Step 5:** In `runMigrations()`, extend the existing `tank_settings` `columns` array with:

```ts
    { name: "valve_travel_time", type: "INTEGER DEFAULT 10" },
    { name: "sump_autostart", type: "INTEGER DEFAULT 1" },
```

- [ ] **Step 6:** In `api/data/Tank.data.ts`, normalize the new boolean everywhere raw rows escape: in `getTankData` next to the existing `has_reservoir` normalization add `if (tankSettings.sump_autostart !== undefined) tankSettings.sump_autostart = !!tankSettings.sump_autostart;` and in `getTankSettings` before returning add:

```ts
        if (tankSettings.sump_autostart !== undefined) {
          tankSettings.sump_autostart = !!tankSettings.sump_autostart;
        }
```

- [ ] **Step 7:** Type-check: `cd api && npx tsc --noEmit` (expect only pre-existing errors, if any; note Task 3 creates `Sump.logic.ts`, so the lazy `require` in Step 3 will resolve then — if `tsc` flags the missing module now, proceed; it is created next task, and re-check there).
- [ ] **Step 8:** Commit: `"Add sump GPIO lines, safe relay wrappers, float poller, and settings migration"`

---

### Task 3: API — SumpManager state machine

**Files:**
- Create: `api/logic/Sump.logic.ts`

**Interfaces:**
- Consumes: `safeRelayOn/safeRelayOff/MAIN_VALVE_LINE/SUMP_PUMP_LINE/DataManager` (Task 2), `TankDataManager.getSumpForTank/getTankSettings/getAllTanks`, `NotifyManager.sendDiscord`, Task 1 enums.
- Produces (all static on `SumpManager`): `state: System.SumpState`, `sumpFull: boolean`, `tankId: string | null`, `start(tankId): Promise<{ok: boolean; error?: string}>`, `stop(reason): Promise<void>`, `resetLockout(): Promise<{ok: boolean; error?: string}>`, `onSumpLevelChange(sumpFull: boolean): void`, `pauseForMaintenance(): Promise<void>`, `resumeIfPaused(): Promise<void>`, `autostart(): Promise<void>`.

- [ ] **Step 1:** Create `api/logic/Sump.logic.ts`:

```ts
import { System } from "aquario-models/lib/System.model";
import {
  DataManager,
  safeRelayOn,
  safeRelayOff,
  MAIN_VALVE_LINE,
  SUMP_PUMP_LINE,
} from "../data/common.data";
import { TankDataManager } from "../data/Tank.data";
import { NotifyManager } from "./Notify.logic";

export type SumpStopReason = "manual" | "water_change" | "sump_full" | "shutdown";

export class SumpManager {
  static state: System.SumpState = System.SumpState.STOPPED;
  static sumpFull: boolean = false;
  static tankId: string | null = null; // display tank the sump serves
  static resumePending: boolean = false; // restart after a maintenance cycle
  private static valveTimer?: NodeJS.Timeout;

  private static broadcast = (reason?: string): void => {
    DataManager.send({
      action: System.ServiceUpdate.SUMP_STATE,
      data: { tank_id: this.tankId, state: this.state, reason },
    });
  };

  private static getValveTravelTime = async (
    tankId: string | null
  ): Promise<number> => {
    if (!tankId) return 10;
    const settings = await TankDataManager.getTankSettings(tankId);
    const t = settings?.valve_travel_time;
    return typeof t === "number" && t > 0 ? t : 10;
  };

  static start = async (
    tankId: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (this.state === System.SumpState.LOCKED_OUT) {
      return { ok: false, error: "sump is locked out — reset required" };
    }
    if (this.sumpFull) {
      return { ok: false, error: "sump float reads full" };
    }
    if (
      this.state === System.SumpState.RUNNING ||
      this.state === System.SumpState.OPENING_VALVE
    ) {
      return { ok: true }; // already on the way up
    }
    const { MaintenanceManager } = require("./Maintenance.logic");
    if (MaintenanceManager.serviceStatus !== System.State.IDLE) {
      return { ok: false, error: "maintenance cycle in progress" };
    }
    const sump = await TankDataManager.getSumpForTank(tankId);
    if (!sump) {
      return { ok: false, error: "no sump connected to this tank" };
    }

    this.tankId = tankId;
    if (this.valveTimer) clearTimeout(this.valveTimer);
    safeRelayOn(MAIN_VALVE_LINE); // valve starts motoring open
    this.state = System.SumpState.OPENING_VALVE;
    this.broadcast();

    const travel = await this.getValveTravelTime(tankId);
    this.valveTimer = setTimeout(() => {
      // Only proceed if nothing interrupted the opening sequence
      if (this.state === System.SumpState.OPENING_VALVE) {
        safeRelayOn(SUMP_PUMP_LINE); // valve is open — start the return pump
        this.state = System.SumpState.RUNNING;
        this.broadcast();
      }
    }, travel * 1000);
    return { ok: true };
  };

  static stop = async (reason: SumpStopReason): Promise<void> => {
    if (
      this.state === System.SumpState.STOPPED ||
      this.state === System.SumpState.LOCKED_OUT
    ) {
      return;
    }
    if (this.valveTimer) clearTimeout(this.valveTimer);
    safeRelayOff(SUMP_PUMP_LINE); // pump off first, always
    safeRelayOff(MAIN_VALVE_LINE); // valve motors closed on its own power-off
    this.state = System.SumpState.STOPPING;
    this.broadcast(reason);

    const travel = await this.getValveTravelTime(this.tankId);
    this.valveTimer = setTimeout(() => {
      if (this.state === System.SumpState.STOPPING) {
        this.state = System.SumpState.STOPPED;
        this.broadcast(reason);
      }
    }, travel * 1000);
  };

  static onSumpLevelChange = (sumpFull: boolean): void => {
    this.sumpFull = sumpFull;
    if (sumpFull && this.state !== System.SumpState.LOCKED_OUT) {
      this.lockout();
    }
  };

  private static lockout = (): void => {
    if (this.valveTimer) clearTimeout(this.valveTimer);
    safeRelayOff(SUMP_PUMP_LINE);
    safeRelayOff(MAIN_VALVE_LINE);
    this.state = System.SumpState.LOCKED_OUT;
    this.resumePending = false; // never auto-restart out of a lockout
    this.broadcast("sump_full");
    NotifyManager.sendDiscord(
      "🚨 **Sump Alert** — the sump float switch reads FULL. " +
        "Return pump stopped and main valve closed. " +
        "Check the sump before resetting the lockout."
    );
  };

  static resetLockout = async (): Promise<{ ok: boolean; error?: string }> => {
    if (this.state !== System.SumpState.LOCKED_OUT) {
      return { ok: false, error: "sump is not locked out" };
    }
    if (this.sumpFull) {
      return { ok: false, error: "sump float still reads full" };
    }
    this.state = System.SumpState.STOPPED;
    this.broadcast("lockout_reset");
    return { ok: true };
  };

  static pauseForMaintenance = async (): Promise<void> => {
    const active =
      this.state === System.SumpState.RUNNING ||
      this.state === System.SumpState.OPENING_VALVE;
    if (active) {
      this.resumePending = true;
      await this.stop("water_change");
    }
  };

  static resumeIfPaused = async (): Promise<void> => {
    if (!this.resumePending || !this.tankId) return;
    this.resumePending = false;
    await this.start(this.tankId);
  };

  static autostart = async (): Promise<void> => {
    try {
      const tanks = await TankDataManager.getAllTanks();
      const sump = (tanks as any[]).find(
        (t) => t.role === "sump" && t.parent_tank_id
      );
      if (!sump) return;
      const settings = await TankDataManager.getTankSettings(
        sump.parent_tank_id
      );
      if (settings?.sump_autostart === false) return;
      const result = await this.start(sump.parent_tank_id);
      if (!result.ok) {
        console.warn("[Sump] autostart skipped:", result.error);
      }
    } catch (e) {
      console.error("[Sump] autostart failed:", e);
    }
  };
}
```

- [ ] **Step 2:** Type-check: `cd api && npx tsc --noEmit` — no new errors (this also resolves Task 2's lazy require target).
- [ ] **Step 3:** Commit: `"Add SumpManager state machine for return pump and main valve"`

---

### Task 4: API — sump controller, WebSocket actions, boot autostart

**Files:**
- Create: `api/controllers/Sump.controller.ts`
- Modify: `api/index.ts`
- Modify: `api/data/common.data.ts` (WebSocket switch)

**Interfaces:**
- Consumes: `SumpManager` (Task 3), Task 1 enums.
- Produces: routes `GET /sump/start/:tankId`, `GET /sump/stop/:tankId`, `GET /sump/reset/:tankId`, `GET /sump/status/:tankId` (→ `{ state: number, sumpFull: boolean }`); exported `startSumpEndpoint(tankId)`, `stopSumpEndpoint()`, `resetSumpEndpoint()` for the WS switch; WS actions `start_sump`, `stop_sump`, `reset_sump_lockout`, and `sump_water_level` parameter check replying `{ sumpFull, state }`.

- [ ] **Step 1:** Create `api/controllers/Sump.controller.ts`:

```ts
import express from "express";
import { SumpManager } from "../logic/Sump.logic";

const router = express.Router();

export const startSumpEndpoint = async (tankId: string) => {
  return SumpManager.start(tankId);
};

export const stopSumpEndpoint = async () => {
  await SumpManager.stop("manual");
  return { ok: true };
};

export const resetSumpEndpoint = async () => {
  return SumpManager.resetLockout();
};

router.get("/start/:tankId", async (req, res) => {
  const result = await startSumpEndpoint(req.params.tankId);
  res.status(result.ok ? 200 : 409).json(result);
});

router.get("/stop/:tankId", async (_req, res) => {
  res.json(await stopSumpEndpoint());
});

router.get("/reset/:tankId", async (_req, res) => {
  const result = await resetSumpEndpoint();
  res.status(result.ok ? 200 : 409).json(result);
});

router.get("/status/:tankId", (_req, res) => {
  res.json({ state: SumpManager.state, sumpFull: SumpManager.sumpFull });
});

export default router;
```

- [ ] **Step 2:** In `api/index.ts`: `import sumpController from "./controllers/Sump.controller";` and `import { SumpManager } from "./logic/Sump.logic";` at the top; `app.use("/sump", jsonParser, urlencodedParser, sumpController);` next to the other `app.use` mounts; and in the `app.listen` callback, after `ScheduleManager.start();` add:

```ts
  await SumpManager.autostart();
```

(Order matters: migrations and GPIO init have already run by then, so the valve-then-pump sequence starts from a safe all-off state.)

- [ ] **Step 3:** In `api/data/common.data.ts`, extend the imports from the controllers section with `import { startSumpEndpoint, stopSumpEndpoint, resetSumpEndpoint } from "../controllers/Sump.controller";` and add cases to the WS message switch (next to the existing ServiceRequest cases):

```ts
                  case System.ServiceRequest.START_SUMP:
                    startSumpEndpoint(data.tank_id);
                    break;
                  case System.ServiceRequest.STOP_SUMP:
                    stopSumpEndpoint();
                    break;
                  case System.ServiceRequest.RESET_SUMP_LOCKOUT:
                    resetSumpEndpoint();
                    break;
                  case System.ParameterCheck.SUMP_WATER_LEVEL: {
                    const { SumpManager } = require("../logic/Sump.logic");
                    wsClient.send(
                      JSON.stringify({
                        action: System.ParameterUpdate.SUMP_WATER_LEVEL,
                        data: {
                          tank_id: data?.tank_id,
                          sumpFull: SumpManager.sumpFull,
                          state: SumpManager.state,
                        },
                      })
                    );
                    break;
                  }
```

Note: `ParameterCheck.WATER_LEVEL` and `ParameterCheck.SUMP_WATER_LEVEL` share the switch with the ServiceRequest cases — TypeScript may warn about comparing overlapping enums; the existing file already mixes both enums in one switch, so follow suit.

- [ ] **Step 4:** Type-check `cd api && npx tsc --noEmit`; then a smoke run off-Pi: `cd api && timeout 15 npx ts-node index.ts` — expect it to boot, log GPIO errors (no gpioset on macOS — proves safe wrappers don't crash), log `[Sump] autostart skipped:` or nothing (no DB), and the port listening line.
- [ ] **Step 5:** Commit: `"Add sump REST endpoints, WebSocket actions, and boot autostart"`

---

### Task 5: API — maintenance interlocks, reservoir guard, idle-status fix

**Files:**
- Modify: `api/logic/Maintenance.logic.ts`
- Modify: `api/controllers/Maintenance.controller.ts`

**Interfaces:**
- Consumes: `SumpManager.pauseForMaintenance/resumeIfPaused/state` (Task 3).
- Produces: drain and water-change always pause the sump first and resume it on completion/cancel; `MaintenanceManager.serviceStatus` returns to `IDLE` (memory + DB) when any operation completes; reservoir fill is skipped when the tank has a linked sump.

- [ ] **Step 1:** In `api/logic/Maintenance.logic.ts`, `waterChange`: pause the sump before anything else and mark completion idle. Replace the method body's opening and the `completeAction` definition:

```ts
  static waterChange = async (
    tank_id: string,
    drainTime: number = 0,
    fillTime: number = 0,
    resFillTime: number = 0
  ): Promise<void> => {
    const { SumpManager } = require("./Sump.logic");
    await SumpManager.pauseForMaintenance();
    this.reset(tank_id);
    DataManager.send({
      data: { tank_id },
      action: System.ServiceUpdate.WATER_CHANGE_BEGAN,
    });

    await this.drain(tank_id, drainTime, true);

    this.setServiceDelay(
      "fill",
      async () => {
        await this.fill(tank_id, fillTime, true);
      },
      drainTime * 1000
    );

    const completeAction = async () => {
      this.serviceStatus = System.State.IDLE;
      await MaintenanceDataManager.setServiceStatus(tank_id, this.serviceStatus);
      DataManager.send({
        data: { tank_id },
        action: System.ServiceUpdate.WATER_CHANGE_COMPLETE,
      });
      SumpManager.resumeIfPaused();
    };

    if (resFillTime && resFillTime > 0) {
      this.setServiceDelay("fill_res", completeAction, (drainTime + fillTime + resFillTime) * 1000);
    } else {
      this.setServiceDelay("fill", completeAction, (drainTime + fillTime) * 1000);
    }
  };
```

- [ ] **Step 2:** `drain`: pause the sump for standalone drains and go idle + resume at completion. At the top of `drain`, before `relayOn(RELAY_1_LINE);`, add:

```ts
    const { SumpManager } = require("./Sump.logic");
    if (!changing) {
      await SumpManager.pauseForMaintenance();
    }
```

and inside its completion callback, after the `DRAIN_COMPLETE` send, add:

```ts
        if (!changing) {
          this.serviceStatus = System.State.IDLE;
          MaintenanceDataManager.setServiceStatus(tank_id, this.serviceStatus);
          SumpManager.resumeIfPaused();
        }
```

- [ ] **Step 3:** `fill`: standalone fills don't touch the sump, but must also return to idle. Inside `fillCallback`, after the `FILL_COMPLETE` send, add:

```ts
      if (!changing) {
        this.serviceStatus = System.State.IDLE;
        MaintenanceDataManager.setServiceStatus(tank_id, this.serviceStatus);
      }
```

- [ ] **Step 4:** `reset`: relay 3 is now the main valve — only force it off when the sump isn't using it. Replace the `relayOff(RELAY_3_LINE);` line in `reset` with:

```ts
    const { SumpManager } = require("./Sump.logic");
    if (
      SumpManager.state !== System.SumpState.RUNNING &&
      SumpManager.state !== System.SumpState.OPENING_VALVE
    ) {
      relayOff(RELAY_3_LINE); // main valve — safe to close, sump isn't using it
    }
```

- [ ] **Step 5:** `stop` (cancel path): after `this.clearAllServiceDelays();`, add:

```ts
    const { SumpManager } = require("./Sump.logic");
    SumpManager.resumeIfPaused();
```

- [ ] **Step 6:** In `api/controllers/Maintenance.controller.ts`, `waterChangeEndpoint`: skip the reservoir phase when a sump is linked (relay 3 belongs to the valve). Replace the `if (has_reservoir)` block with:

```ts
  const sump = await TankDataManager.getSumpForTank(tankId);
  if (has_reservoir && sump) {
    console.warn(
      `Tank ${tankId} has has_reservoir set but a sump is connected — ` +
        "skipping reservoir fill (relay 3 is the sump main valve)."
    );
  }
  if (has_reservoir && !sump) {
    MaintenanceManager.waterChange(tankId, drain_time, fill_time, res_fill_time);
  } else {
    MaintenanceManager.waterChange(tankId, drain_time, fill_time);
  }
```

- [ ] **Step 7:** Type-check: `cd api && npx tsc --noEmit` — no new errors.
- [ ] **Step 8:** Commit: `"Interlock sump with maintenance cycles; guard reservoir relay; fix stale service status"`

---

### Task 6: Kiosk UI — sump card, DAL wrappers, settings fields

**Files:**
- Modify: `ui/src/dal/Maintenance.dal.ts`
- Modify: `ui/src/views/TankDetail.tsx`
- Modify: `ui/src/components/SettingsDialog.tsx`

**Interfaces:**
- Consumes: Task 1 enums via `aquario-models`; WS broadcasts `sump_state` `{tank_id, state, reason?}` and `sump_water_level` `{sumpFull, state?}`; WS requests from Task 4.
- Produces: `startSump({tank_id})`, `stopSump({tank_id})`, `resetSumpLockout({tank_id})`, `checkSumpLevel({tank_id})` in `Maintenance.dal.ts`.

- [ ] **Step 1:** In `ui/src/dal/Maintenance.dal.ts`, add convenience wrappers after `fillReservoir`:

```ts
export const startSump = async ({ tank_id }: { tank_id?: string | number }) => {
  sendMessage({ action: System.ServiceRequest.START_SUMP, data: { tank_id } });
};

export const stopSump = async ({ tank_id }: { tank_id?: string | number }) => {
  sendMessage({ action: System.ServiceRequest.STOP_SUMP, data: { tank_id } });
};

export const resetSumpLockout = async ({
  tank_id,
}: {
  tank_id?: string | number;
}) => {
  sendMessage({
    action: System.ServiceRequest.RESET_SUMP_LOCKOUT,
    data: { tank_id },
  });
};

export const checkSumpLevel = async ({
  tank_id,
}: {
  tank_id?: string | number;
}) => {
  sendMessage({
    action: System.ParameterCheck.SUMP_WATER_LEVEL,
    data: { tank_id },
  });
};
```

- [ ] **Step 2:** In `ui/src/views/TankDetail.tsx`:
  - Extend the `Maintenance.dal` import list with `startSump, stopSump, resetSumpLockout, checkSumpLevel`.
  - Add state under the existing `sump` state (line ~59):

```tsx
  const [sumpState, setSumpState] = useState<System.SumpState>(
    System.SumpState.STOPPED
  );
  const [sumpFull, setSumpFull] = useState(false);
```

  - In the WS `onMessage` switch add:

```tsx
          case System.ServiceUpdate.SUMP_STATE:
            setSumpState(msg.data.state);
            break;
          case System.ParameterUpdate.SUMP_WATER_LEVEL:
            setSumpFull(!!msg.data.sumpFull);
            if (msg.data.state !== undefined) setSumpState(msg.data.state);
            break;
```

  - In the main effect's initial checks (next to `handleCheckWaterLevel();`) add `checkSumpLevel({ tank_id });`.
  - Above the component (module scope) add:

```tsx
const SUMP_STATE_LABELS: Record<number, string> = {
  [System.SumpState.STOPPED]: "Stopped",
  [System.SumpState.OPENING_VALVE]: "Opening Valve…",
  [System.SumpState.RUNNING]: "Running",
  [System.SumpState.STOPPING]: "Stopping…",
  [System.SumpState.LOCKED_OUT]: "LOCKED OUT — SUMP FULL",
};
```

  - Replace `{sump && <Item variant="button">Sump: {sump.name}</Item>}` (line ~274) with:

```tsx
        {sump && (
          <Stack direction="column" alignItems="center" spacing={1} sx={{ p: 1 }}>
            <Item
              variant="button"
              sx={
                sumpState === System.SumpState.LOCKED_OUT
                  ? { color: "error.main", fontWeight: "bold" }
                  : undefined
              }
            >
              Sump: {sump.name} — {SUMP_STATE_LABELS[sumpState]}
              {sumpFull ? " (float: FULL)" : ""}
            </Item>
            <Stack direction="row" spacing={2}>
              {sumpState === System.SumpState.LOCKED_OUT ? (
                <Button
                  color="error"
                  variant="contained"
                  onClick={() => resetSumpLockout({ tank_id })}
                >
                  Reset Lockout
                </Button>
              ) : sumpState === System.SumpState.STOPPED ? (
                <Button
                  variant="outlined"
                  disabled={serviceStatus > System.State.IDLE}
                  onClick={() => startSump({ tank_id })}
                >
                  Start Sump
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  onClick={() => stopSump({ tank_id })}
                >
                  Stop Sump
                </Button>
              )}
            </Stack>
          </Stack>
        )}
```

- [ ] **Step 3:** In `ui/src/components/SettingsDialog.tsx`, add state + hydration + save + two list items following the existing patterns exactly:
  - State: `const [valve_travel_time, setValveTravelTime] = useState(10);` and `const [sump_autostart, setSumpAutostart] = useState(true);`
  - In the `useEffect`: `setValveTravelTime(settings.valve_travel_time ?? 10);` and `setSumpAutostart(settings.sump_autostart ?? true);`
  - `handleSave`: `onSave({ drain_time, fill_time, has_reservoir, valve_travel_time, sump_autostart });`
  - After the Reservoir Mode `ListItem` (keep its `<Divider />`), add:

```tsx
        <ListItem>
          <div>
            <Typography gutterBottom>Sump Valve Travel Time:</Typography>
            <Typography gutterBottom>{valve_travel_time}s</Typography>
          </div>
          <Slider
            value={valve_travel_time}
            onChange={(e, newValue) => setValveTravelTime(newValue as number)}
            step={1}
            min={1}
            max={60}
            valueLabelFormat={(v) => `${v}s`}
            valueLabelDisplay="auto"
          />
        </ListItem>
        <Divider />
        <ListItem>
          <Typography gutterBottom>Sump Auto-Start:</Typography>
          <Switch
            name="sump_autostart"
            checked={sump_autostart}
            onChange={(e, newValue) => setSumpAutostart(newValue)}
          />
        </ListItem>
        <Divider />
```

- [ ] **Step 4:** Verify: `cd ui && npx tsc --noEmit` passes and `CI=true npx react-scripts test --watchAll=false` still passes (existing suites only; no new UI tests here — the sump card is presentational wiring over WS state).
- [ ] **Step 5:** Commit: `"Add sump pump controls and valve settings to kiosk UI"`

---

### Task 7: iOS — sump state, controls, and status fetch

**Files:**
- Modify: `ios/ExoPet/ExoPet/Services/WebSocketService.swift`
- Modify: `ios/ExoPet/ExoPet/Services/APIService.swift`
- Modify: `ios/ExoPet/ExoPet/ViewModels/TankDetailViewModel.swift`
- Modify: `ios/ExoPet/ExoPet/Views/TankDetailView.swift`

**Interfaces:**
- Consumes: Swift enums from Task 1; API routes from Task 4.
- Produces: `WebSocketService.startSump(tankId:)/stopSump(tankId:)/resetSumpLockout(tankId:)`; `APIService.getSumpStatus(tankId:) async throws -> SumpStatus` where `struct SumpStatus: Codable { let state: Int; let sumpFull: Bool }`; VM `@Published var sumpState: SumpState`, `@Published var sumpFull: Bool`, `func handleStartSump()/handleStopSump()/handleResetSumpLockout()`.

- [ ] **Step 1:** In `WebSocketService.swift`, next to `startWaterChange(tankId:)`, add:

```swift
    func startSump(tankId: String) {
        send(action: ServiceRequest.startSump.rawValue, data: ["tank_id": tankId])
    }

    func stopSump(tankId: String) {
        send(action: ServiceRequest.stopSump.rawValue, data: ["tank_id": tankId])
    }

    func resetSumpLockout(tankId: String) {
        send(action: ServiceRequest.resetSumpLockout.rawValue, data: ["tank_id": tankId])
    }
```

- [ ] **Step 2:** In `APIService.swift`, next to `getTankDetails`, add:

```swift
    struct SumpStatus: Codable {
        let state: Int
        let sumpFull: Bool
    }

    func getSumpStatus(tankId: String) async throws -> SumpStatus {
        let data = try await get("/sump/status/\(tankId)")
        return try decoder.decode(SumpStatus.self, from: data)
    }
```

- [ ] **Step 3:** In `TankDetailViewModel.swift`:
  - Add `@Published var sumpState: SumpState = .stopped` and `@Published var sumpFull = false` next to the existing `@Published var sump: Tank?`.
  - In the load path where `self.sump = try await api.getTankSump(tankId: tankId)` runs, after it add:

```swift
            if self.sump != nil {
                if let status = try? await api.getSumpStatus(tankId: tankId) {
                    self.sumpState = SumpState(rawValue: status.state) ?? .stopped
                    self.sumpFull = status.sumpFull
                }
            }
```

  - In `handleWSMessage`'s switch, add:

```swift
        case ServiceUpdate.sumpState.rawValue:
            if let raw = data?["state"] as? Int, let s = SumpState(rawValue: raw) {
                sumpState = s
            }

        case ParameterAction.sumpWaterLevel.rawValue:
            if let full = data?["sumpFull"] as? Bool {
                sumpFull = full
            }
            if let raw = data?["state"] as? Int, let s = SumpState(rawValue: raw) {
                sumpState = s
            }
```

(`ParameterAction` = whatever the existing parameter enum is named in `SystemEnums.swift`; match it.)
  - Add action methods next to `handleWaterChange()`:

```swift
    func handleStartSump() {
        ws.startSump(tankId: tankId)
    }

    func handleStopSump() {
        ws.stopSump(tankId: tankId)
    }

    func handleResetSumpLockout() {
        ws.resetSumpLockout(tankId: tankId)
    }
```

- [ ] **Step 4:** In `TankDetailView.swift`, inside `sumpSection`'s `if let sump = vm.sump` branch, extend the connected card: below the existing `HStack` (name + Disconnect), inside the same card `VStack`/container, add a status + controls row (follow the card's styling — `ExoPetColors.cardSurface`, `.font(.subheadline)`):

```swift
            HStack {
                Circle()
                    .fill(sumpStatusColor)
                    .frame(width: 10, height: 10)
                Text(sumpStatusLabel)
                    .font(.subheadline)
                    .foregroundColor(vm.sumpState == .lockedOut ? .red : .white)
                Spacer()
                if vm.sumpState == .lockedOut {
                    Button("Reset Lockout") { vm.handleResetSumpLockout() }
                        .font(.subheadline)
                        .foregroundColor(.red)
                } else if vm.sumpState == .stopped {
                    Button("Start") { vm.handleStartSump() }
                        .font(.subheadline)
                        .disabled(vm.serviceStatus > .idle)
                } else {
                    Button("Stop") { vm.handleStopSump() }
                        .font(.subheadline)
                }
            }
            .padding()
            .background(ExoPetColors.cardSurface)
            .cornerRadius(8)
```

with computed helpers in the view:

```swift
    private var sumpStatusLabel: String {
        switch vm.sumpState {
        case .stopped: return "Stopped"
        case .openingValve: return "Opening Valve…"
        case .running: return "Running"
        case .stopping: return "Stopping…"
        case .lockedOut: return vm.sumpFull ? "LOCKED OUT — Sump Full" : "LOCKED OUT"
        }
    }

    private var sumpStatusColor: Color {
        switch vm.sumpState {
        case .running: return .green
        case .openingValve, .stopping: return .yellow
        case .stopped: return .gray
        case .lockedOut: return .red
        }
    }
```

- [ ] **Step 5:** Build: `cd ios/ExoPet && xcodebuild -project ExoPet.xcodeproj -scheme ExoPet -destination 'generic/platform=iOS Simulator' -quiet build` → exit 0.
- [ ] **Step 6:** Commit: `"Add sump pump status and controls to iOS tank detail"`

---

### Task 8: Deploy + live verification

- [ ] **Step 1:** Deploy to hub: scp changed `api/` files, `models/src`, `models/lib` to `exopet@exopet-api.local:~/exopet/`; restart `exopet.service`. Tail the journal for the boot sequence: migrations add the two columns (first boot only), GPIO init lines, and either sump autostart activity or `[Sump] autostart skipped: no sump connected to this tank`.
- [ ] **Step 2:** Deploy to kiosk: scp changed `ui/src` files + `models/src` + `models/lib` to `exopet@exopet-ui.local:~/exopet/`; restart `exopet-kiosk.service`; confirm the dev server recompiles clean.
- [ ] **Step 3:** Curl checks against `http://exopet-api.local:3001` using the real display tank id (`de993126-d6b0-48e9-b1d4-0486cea71d05`) — expected in order (assuming the Axolotl Sump entity is linked and the sump float is dry):
  1. `GET /sump/status/<displayId>` → `{"state":0,"sumpFull":false}` or `{"state":2,...}` if autostart ran.
  2. `GET /sump/start/<displayId>` → `{"ok":true}`; ~`valve_travel_time`s later `GET /sump/status` → `{"state":2,...}` (watch/listen for relay 3 then relay 4 clicks if at the tank).
  3. `GET /maintenance/drain/<displayId>` → drain starts; immediately `GET /sump/status` → state `3` (STOPPING) or `0`; after the drain time elapses, status returns to `1` then `2` (auto-resume).
  4. `GET /sump/stop/<displayId>` → `{"ok":true}`; status `3` then `0`.
  5. `GET /sump/reset/<displayId>` while not locked out → 409 `{"ok":false,"error":"sump is not locked out"}`.
- [ ] **Step 4:** Physical checks (when at the tank, hardware wired): lift the sump float by hand → relays drop out, Discord alert arrives, kiosk + iOS show LOCKED OUT, reset refused until the float drops, then reset + start works. Reboot the hub → autostart brings the sump up after the valve delay.
- [ ] **Step 5:** Final commit of any deploy-driven fixes; push the branch.
