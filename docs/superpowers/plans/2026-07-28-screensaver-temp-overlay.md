# Screensaver Temperature Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overlay per-tank temperature chips (colored by status, gray when a sensor is inactive) on the kiosk screensaver, fed by a new aggregate API endpoint.

**Architecture:** New `GET /tank/temperatures` endpoint (Express, `api/`) returns one status per thermometer-equipped tank with `average: null` as the "sensor inactive" signal. The kiosk (`ui/`, CRA + Electron + MUI) polls it every 15s from a `TempStatusOverlay` component rendered inside the existing `Screensaver`. Status colors reuse the app-bar's `dangerLevel`/`temperatureGaugeColor` logic, extracted to a shared util.

**Tech Stack:** Express + TypeScript + sqlite (api), React 18 + react-scripts 5 + MUI v5 + axios + jest/@testing-library (ui). **No new dependencies.**

**Spec:** `docs/superpowers/specs/2026-07-28-screensaver-temp-overlay-design.md`

## Global Constraints

- No new npm dependencies in either package.
- Temperatures are **Celsius** end-to-end; UI displays both units like `TankTemp` does (`{Math.round(c)}°C / {Math.round(c * 1.8 + 32)}°F`).
- `average: null` in a status = sensor inactive for that tank. Tanks with zero `Thermometer` sensors are omitted from the response entirely.
- UI threshold fallbacks when settings are unset/0: `lower_temp_limit || 25`, `upper_temp_limit || 30` (same as `TankTemp.tsx:81-82`).
- The new route must be registered BEFORE `router.get("/:tankId", ...)` (currently `api/controllers/Tank.controller.ts:32`) or Express will treat "temperatures" as a tank id.
- Overlay behavior: poll every 15s; 3 consecutive failures → all chips gray; corner drift every 2 minutes across all four corners; `pointer-events: none`; no tank names on chips.
- Build environment: the default shell Node is v16 — too old for parts of the toolchain. Prefix build/test commands with `PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`.
- `api/` has no test framework — its verification is `npm run build` (tsc). `ui/` has jest via react-scripts: run with `CI=true npx react-scripts test --watchAll=false <pattern>` from `ui/`.
- Do not change `TankTemp`'s rendered behavior, the WebSocket protocol, or the models package.

## File Structure

```
api/logic/Tank.logic.ts            # modify: add TankTemperatureStatus + getAllTemperatureStatuses()
api/controllers/Tank.controller.ts # modify: add GET /temperatures; fix /:tankId/temperature handler
ui/src/utils/temperature.ts        # create: dangerLevel + temperatureGaugeColor (moved verbatim)
ui/src/utils/temperature.test.ts   # create: unit tests for both functions
ui/src/components/AppBar/TankTemp.tsx  # modify: import from utils, delete local copies
ui/src/dal/Tank.dal.ts             # modify: add TankTempStatus type + getTemperatureStatuses()
ui/src/components/TempStatusOverlay.tsx       # create: polling + chips + drift
ui/src/components/TempStatusOverlay.test.tsx  # create: component tests (mocked DAL)
ui/src/components/Screensaver.tsx  # modify: render <TempStatusOverlay /> in the overlay
ui/src/components/Screensaver.test.tsx        # modify: mock the DAL module
```

---

### Task 1: API — aggregate endpoint + broken-route fix

**Files:**
- Modify: `api/logic/Tank.logic.ts` (add after `getTemperatures`, which ends ~line 36)
- Modify: `api/controllers/Tank.controller.ts` (insert new route after the `/all` handler ending at line 19; replace the `/:tankId/temperature` handler at lines 98-121)

**Interfaces:**
- Consumes (existing): `TankDataManager.getAllTanks(): Promise<Tank[]>`, `TankDataManager.getTankSettings(tankId): Promise<TankSettings | null>`, `SensorDataManager.getSensorsForTank(tankId: string, type?: string): Promise<string[]>`, `SensorDataManager.readTemperature(sensorId: string): Promise<number | null>`, `TankManager.getTemperatures(tankId)` (already imported in the controller at line 7).
- Produces: `GET /tank/temperatures` → `{ statuses: TankTemperatureStatus[] }` where `TankTemperatureStatus = { tank_id: string; name?: string; average: number | null; lower_temp_limit?: number; upper_temp_limit?: number }` (exported from `Tank.logic.ts`). Task 3's DAL mirrors this shape.

- [ ] **Step 1: Add the status type and logic method to `api/logic/Tank.logic.ts`**

Add after the closing of `getTemperatures` (before `getTankSettings`):

```ts
  static getAllTemperatureStatuses = async (): Promise<
    TankTemperatureStatus[]
  > => {
    const tanks = (await TankDataManager.getAllTanks()) || [];
    const statuses: TankTemperatureStatus[] = [];
    for (const tank of tanks) {
      const sensors = await SensorDataManager.getSensorsForTank(
        tank.id,
        "Thermometer"
      );
      if (sensors.length === 0) {
        continue;
      }
      const temps: number[] = [];
      for (const sensor of sensors) {
        const temperature = await SensorDataManager.readTemperature(sensor);
        if (!temperature) {
          continue;
        }
        temps.push(temperature);
      }
      const settings = await TankDataManager.getTankSettings(tank.id);
      statuses.push({
        tank_id: tank.id,
        name: tank.name,
        average:
          temps.length > 0
            ? temps.reduce((a, b) => a + b, 0) / temps.length
            : null,
        lower_temp_limit: settings?.lower_temp_limit,
        upper_temp_limit: settings?.upper_temp_limit,
      });
    }
    return statuses;
  };
```

And add this exported interface at the bottom of the file (outside the class):

```ts
export interface TankTemperatureStatus {
  tank_id: string;
  name?: string;
  average: number | null;
  lower_temp_limit?: number;
  upper_temp_limit?: number;
}
```

- [ ] **Step 2: Register the aggregate route in `api/controllers/Tank.controller.ts`**

Insert between the `/all` handler (ends line 19) and the `/add` handler (starts line 21):

```ts
// Registered before the /:tankId routes so the literal path wins.
router.get("/temperatures", async (req, res) => {
  try {
    const statuses = await TankManager.getAllTemperatureStatuses();
    res.json({ statuses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 3: Fix the broken `/:tankId/temperature` handler**

Replace the entire handler body (lines 98-121, the one containing the stray `return;` after `temps.push(temperature);`) with a delegation to the already-correct logic method:

```ts
router.get("/:tankId/temperature", async (req, res) => {
  try {
    const tankId = req.params.tankId;
    const data = await TankManager.getTemperatures(tankId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

(The `SensorDataManager` import at the top of the controller stays — other routes use it.)

- [ ] **Step 4: Type-check the API**

Run: `cd api && PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" npm run build`
Expected: tsc exits clean.

- [ ] **Step 5: Smoke-test the route if the API starts locally (optional, don't block on it)**

Run: `cd api && PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" npm start` then `curl -s localhost:3001/tank/temperatures` (port is `API_PORT` env or 3001, per `api/index.ts:15`). On a dev Mac, DS18B20 reads fail, so expect `average: null` entries or `{"statuses":[]}` — both prove the route resolves as a literal path (not 404/param capture). If the API can't start locally (missing DB), note that and rely on Step 4 + Task 4.

- [ ] **Step 6: Commit**

```bash
git add api/logic/Tank.logic.ts api/controllers/Tank.controller.ts
git commit -m "Add aggregate tank temperature endpoint; fix broken per-tank temperature route"
```

---

### Task 2: UI — extract shared temperature-status util

**Files:**
- Create: `ui/src/utils/temperature.ts`
- Create: `ui/src/utils/temperature.test.ts`
- Modify: `ui/src/components/AppBar/TankTemp.tsx` (delete local `dangerLevel` and `temperatureGaugeColor` at lines 18-74; import instead)

**Interfaces:**
- Produces: `dangerLevel({currentTemp, lower_temp_limit, upper_temp_limit}): string` and `temperatureGaugeColor({currentTemp, lower_temp_limit, upper_temp_limit}): string` from `ui/src/utils/temperature.ts` — the exact functions currently at `TankTemp.tsx:18-74`, moved verbatim. Task 3 imports `temperatureGaugeColor`.

- [ ] **Step 1: Write the failing test `ui/src/utils/temperature.test.ts`**

```ts
import { dangerLevel, temperatureGaugeColor } from "./temperature";

const limits = { lower_temp_limit: 24, upper_temp_limit: 28 };

describe("dangerLevel", () => {
  it.each([
    [18, "dangerously cold"],
    [21, "very cold"],
    [23.5, "cold"],
    [26, "ideal"],
    [28.5, "warm"],
    [30, "very warm"],
    [31.5, "dangerously warm"],
  ])("maps %s°C to %s", (currentTemp, expected) => {
    expect(dangerLevel({ currentTemp, ...limits })).toBe(expected);
  });
});

describe("temperatureGaugeColor", () => {
  it.each([
    [18, "indigo"],
    [21, "blue"],
    [23.5, "cyan"],
    [26, "lime"],
    [28.5, "yellow"],
    [30, "orange"],
    [31.5, "red"],
  ])("maps %s°C to %s", (currentTemp, expected) => {
    expect(temperatureGaugeColor({ currentTemp, ...limits })).toBe(expected);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd ui && CI=true PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" npx react-scripts test --watchAll=false temperature.test`
Expected: FAIL — module `./temperature` not found.

- [ ] **Step 3: Create `ui/src/utils/temperature.ts`**

Move the two functions from `TankTemp.tsx:18-74` verbatim, adding `export`:

```ts
export const dangerLevel = ({
  currentTemp,
  lower_temp_limit,
  upper_temp_limit,
}: {
  currentTemp: number;
  lower_temp_limit: number;
  upper_temp_limit: number;
}) => {
  if (currentTemp < lower_temp_limit - 5) {
    return "dangerously cold";
  } else if (currentTemp < lower_temp_limit - 2.5) {
    return "very cold";
  } else if (currentTemp < lower_temp_limit) {
    return "cold";
  } else if (currentTemp > upper_temp_limit + 3) {
    return "dangerously warm";
  } else if (currentTemp > upper_temp_limit + 1.5) {
    return "very warm";
  } else if (currentTemp > upper_temp_limit) {
    return "warm";
  } else {
    return "ideal";
  }
};

export const temperatureGaugeColor = ({
  currentTemp,
  lower_temp_limit,
  upper_temp_limit,
}: {
  currentTemp: number;
  lower_temp_limit: number;
  upper_temp_limit: number;
}) => {
  const danger = dangerLevel({
    currentTemp,
    lower_temp_limit,
    upper_temp_limit,
  });
  switch (danger) {
    case "dangerously cold":
      return "indigo";
    case "very cold":
      return "blue";
    case "cold":
      return "cyan";
    case "dangerously warm":
      return "red";
    case "very warm":
      return "orange";
    case "warm":
      return "yellow";
    default:
      return "lime";
  }
};
```

- [ ] **Step 4: Point `TankTemp.tsx` at the util**

Delete lines 18-74 (both local function definitions) and add to the imports:

```ts
import { dangerLevel, temperatureGaugeColor } from "../../utils/temperature";
```

- [ ] **Step 5: Run the tests to verify they pass (plus the rest of the suite)**

Run: `cd ui && CI=true PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" npx react-scripts test --watchAll=false`
Expected: temperature tests PASS; existing Screensaver tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add ui/src/utils/temperature.ts ui/src/utils/temperature.test.ts ui/src/components/AppBar/TankTemp.tsx
git commit -m "Extract temperature status logic into shared util"
```

---

### Task 3: UI — DAL call, TempStatusOverlay, screensaver wiring

**Files:**
- Modify: `ui/src/dal/Tank.dal.ts` (append)
- Create: `ui/src/components/TempStatusOverlay.tsx`
- Create: `ui/src/components/TempStatusOverlay.test.tsx`
- Modify: `ui/src/components/Screensaver.tsx` (render the overlay inside the fixed div, after the `<video>`)
- Modify: `ui/src/components/Screensaver.test.tsx` (mock the DAL so overlay polling is inert)

**Interfaces:**
- Consumes: `temperatureGaugeColor` from `../utils/temperature` (Task 2); `GET /tank/temperatures` → `{ statuses: [...] }` (Task 1).
- Produces: `TankTempStatus` interface and `getTemperatureStatuses(): Promise<TankTempStatus[]>` from `ui/src/dal/Tank.dal.ts`; default-exported `TempStatusOverlay` component.

- [ ] **Step 1: Add the DAL type + fetch to `ui/src/dal/Tank.dal.ts`**

Append at the end of the file:

```ts
export interface TankTempStatus {
  tank_id: string;
  name?: string;
  average: number | null;
  lower_temp_limit?: number;
  upper_temp_limit?: number;
}

export const getTemperatureStatuses = async (): Promise<TankTempStatus[]> => {
  const response = await axios.get<{ statuses: TankTempStatus[] }>(
    `${API_BASE_URL}/tank/temperatures`,
    { timeout: 5000 }
  );
  return response.data.statuses;
};
```

(No try/catch here on purpose — the overlay counts failures itself.)

- [ ] **Step 2: Write the failing component test `ui/src/components/TempStatusOverlay.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import TempStatusOverlay from "./TempStatusOverlay";
import * as TankDal from "../dal/Tank.dal";

jest.mock("../dal/Tank.dal");

const mocked = TankDal as jest.Mocked<typeof TankDal>;

describe("TempStatusOverlay", () => {
  it("renders a temperature chip per tank and a dash for inactive sensors", async () => {
    mocked.getTemperatureStatuses.mockResolvedValue([
      {
        tank_id: "t1",
        name: "Cosmo",
        average: 26,
        lower_temp_limit: 24,
        upper_temp_limit: 28,
      },
      { tank_id: "t2", name: "Echo", average: null },
    ]);
    render(<TempStatusOverlay />);
    await waitFor(() =>
      expect(screen.getByText("26°C / 79°F")).toBeInTheDocument()
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders nothing when no tanks have thermometers", async () => {
    mocked.getTemperatureStatuses.mockResolvedValue([]);
    const { container } = render(<TempStatusOverlay />);
    await waitFor(() =>
      expect(mocked.getTemperatureStatuses).toHaveBeenCalled()
    );
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd ui && CI=true PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" npx react-scripts test --watchAll=false TempStatusOverlay`
Expected: FAIL — module `./TempStatusOverlay` not found.

- [ ] **Step 4: Create `ui/src/components/TempStatusOverlay.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import SensorsOffIcon from "@mui/icons-material/SensorsOff";
import { getTemperatureStatuses, TankTempStatus } from "../dal/Tank.dal";
import { temperatureGaugeColor } from "../utils/temperature";

const POLL_MS = 15_000;
const DRIFT_MS = 2 * 60_000;
const MAX_FAILURES = 3;

// Every corner sets the same four properties so the position change
// animates instead of snapping when the anchor side switches.
const CORNERS = [
  { top: "94%", left: "3%", transform: "translate(0, -100%)" },
  { top: "6%", left: "3%", transform: "translate(0, 0)" },
  { top: "6%", left: "97%", transform: "translate(-100%, 0)" },
  { top: "94%", left: "97%", transform: "translate(-100%, -100%)" },
];

export default function TempStatusOverlay() {
  const [statuses, setStatuses] = useState<TankTempStatus[]>([]);
  const [hubDown, setHubDown] = useState(false);
  const [corner, setCorner] = useState(0);
  const failuresRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getTemperatureStatuses();
        if (cancelled) return;
        failuresRef.current = 0;
        setHubDown(false);
        setStatuses(next);
      } catch {
        if (cancelled) return;
        failuresRef.current += 1;
        if (failuresRef.current >= MAX_FAILURES) setHubDown(true);
      }
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(
      () => setCorner((c) => (c + 1) % CORNERS.length),
      DRIFT_MS
    );
    return () => clearInterval(interval);
  }, []);

  if (statuses.length === 0) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        ...CORNERS[corner],
        transition: "top 1.5s ease, left 1.5s ease, transform 1.5s ease",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        pointerEvents: "none",
      }}
    >
      {statuses.map((s) => {
        const inactive = hubDown || s.average == null;
        const color = inactive
          ? "gray"
          : temperatureGaugeColor({
              currentTemp: s.average as number,
              lower_temp_limit: s.lower_temp_limit || 25,
              upper_temp_limit: s.upper_temp_limit || 30,
            });
        return (
          <Box
            key={s.tank_id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 0.75,
              borderRadius: 999,
              backgroundColor: "rgba(0, 0, 0, 0.55)",
            }}
          >
            {inactive ? (
              <SensorsOffIcon sx={{ color }} />
            ) : (
              <ThermostatIcon sx={{ color }} />
            )}
            <Typography sx={{ color, fontSize: "1.5rem", fontWeight: 600 }}>
              {inactive
                ? "—"
                : `${Math.round(s.average as number)}°C / ${Math.round(
                    (s.average as number) * 1.8 + 32
                  )}°F`}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
```

- [ ] **Step 5: Run the component tests to verify they pass**

Run: `cd ui && CI=true PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" npx react-scripts test --watchAll=false TempStatusOverlay`
Expected: PASS (2 tests). Note 26°C → 78.8°F rounds to 79.

- [ ] **Step 6: Render the overlay in `ui/src/components/Screensaver.tsx`**

Add the import:

```tsx
import TempStatusOverlay from "./TempStatusOverlay";
```

Inside the returned fixed-position div, directly after the `</video>` element (line 76), add:

```tsx
      <TempStatusOverlay />
```

- [ ] **Step 7: Mock the DAL in `ui/src/components/Screensaver.test.tsx`**

The saver now mounts the overlay, whose initial poll would hit axios in jsdom. Add directly under the existing imports (before `function LocationProbe`):

```tsx
jest.mock("../dal/Tank.dal", () => ({
  getTemperatureStatuses: jest.fn().mockResolvedValue([]),
}));
```

- [ ] **Step 8: Run the full UI suite**

Run: `cd ui && CI=true PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" npx react-scripts test --watchAll=false`
Expected: all suites PASS (Screensaver, TempStatusOverlay, temperature, plus any pre-existing).

- [ ] **Step 9: Commit**

```bash
git add ui/src/dal/Tank.dal.ts ui/src/components/TempStatusOverlay.tsx ui/src/components/TempStatusOverlay.test.tsx ui/src/components/Screensaver.tsx ui/src/components/Screensaver.test.tsx
git commit -m "Show per-tank temperature status chips on the kiosk screensaver"
```

---

### Task 4: End-to-end verification

**Files:**
- Modify (only if defects found): files from Tasks 1-3.

**Interfaces:**
- Consumes: everything above. Produces: no new exports — a verification report and any polish commits.

- [ ] **Step 1: Production type-checks/builds**

Run: `cd api && PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" npm run build`
Run: `cd ui && CI=true PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" npx react-scripts build`
Expected: both clean. (Use `npx react-scripts build`, not `npm run build`, to skip the Electron packaging step.)

- [ ] **Step 2: Run the stack locally**

Terminal A: `cd api && PATH=... npm start` (HTTP port is `API_PORT` env or 3001; note whether the sqlite DB opens on the dev machine).
Terminal B: `cd ui && REACT_APP_API_HOST=localhost REACT_APP_API_PORT=3001 PATH=... npx react-scripts start` and open the browser tab it launches.

- [ ] **Step 3: Force the screensaver quickly**

Temporarily change the `Screensaver` usage in `ui/src/App.tsx` to `<Screensaver timeoutMs={5000} />`. Wait 5 idle seconds.
Checklist:
- Saver appears with the video; chips appear if the API returned any statuses. On a dev Mac (no /sys/bus/w1), every thermometer-equipped tank shows a gray `—` chip with the sensors-off icon — that IS the inactive path working. If the local DB has no sensors configured, no chips render (also correct); in that case verify the fetch in the network tab returns `{"statuses":[]}` with HTTP 200.
- Tap anywhere: saver dismisses (overlay must not swallow the tap).
- Kill the API process: within ~45s (3 failed polls) any live chips turn gray.
- Restart the API: chips recover on the next successful poll.
- Leave the saver up 2+ minutes: the chip cluster glides to the next corner.
- REVERT the `timeoutMs` change in `App.tsx` when done.

- [ ] **Step 4: Optional live-hub check (skip if the hub isn't reachable)**

If `exopet-api.local` responds on the LAN: `curl -s http://exopet-api.local:<port>/tank/temperatures` — expect real `average` values in Celsius and correct thresholds from tank settings.

- [ ] **Step 5: Commit any polish; confirm clean tree**

```bash
git status --short   # only intentional changes
git add -A && git commit -m "Polish screensaver temperature overlay after end-to-end verification"   # only if fixes were made
```
