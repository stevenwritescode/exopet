# ExoPet — Multi-Enclosure Migration Spec

> **Purpose:** This document specifies every change needed to evolve ExoPet from an aquarium-only, local-network system into a multi-enclosure platform with cloud backup and remote access. It covers support for arbitrary enclosure types (aquariums, terrariums, vivariums, paludariums, aviaries, zoological habitats), cloud-backed data with eventual consistency, and secure remote monitoring/control from anywhere. It is organized by layer and by priority phase.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Target Architecture](#2-target-architecture)
3. [Phase 1 — Rename & Unify (Non-Breaking)](#3-phase-1--rename--unify-non-breaking)
4. [Phase 2 — Enclosure Type System](#4-phase-2--enclosure-type-system)
5. [Phase 3 — Pluggable Maintenance Operations](#5-phase-3--pluggable-maintenance-operations)
6. [Phase 4 — Configurable Food & Feeding](#6-phase-4--configurable-food--feeding)
7. [Phase 5 — Hardware Abstraction Layer](#7-phase-5--hardware-abstraction-layer)
8. [Phase 6 — Environmental Monitoring Expansion](#8-phase-6--environmental-monitoring-expansion)
9. [Phase 7 — UI/iOS Adaptive Enclosure Views](#9-phase-7--uiios-adaptive-enclosure-views)
10. [Phase 8 — Cloud Backup & Sync](#10-phase-8--cloud-backup--sync)
11. [Phase 9 — Remote Access & Push Notifications](#11-phase-9--remote-access--push-notifications)
12. [Database Migration Scripts](#12-database-migration-scripts)
13. [File-by-File Change Index](#13-file-by-file-change-index)

---

## 1. Current State Assessment

### Already Generic
These areas work for any enclosure type today with no changes:

| Area | Details |
|------|---------|
| `Animal.model.ts` | Has `enclosure_id` and `enclosure_type` fields |
| `Log.model.ts` | Uses `container_id` — enclosure-agnostic |
| `sensors` DB table | Uses `container_id` as foreign key |
| `Animal.data.ts:48` | Query uses `WHERE enclosure_id = ?` |
| Temperature reading | `Sensor.data.ts` reads 1-Wire sensors — generic hardware |
| Feeding log system | Log CRUD, feeding timestamps, feeding time rules |
| Animal CRUD | All animal endpoints are enclosure-agnostic |

### Partially Migrated (Inconsistent)
The `Animal` model has both `tank_id` (legacy, line 5) and `enclosure_id`/`enclosure_type` (new, lines 10–11). The DB INSERT in `Animal.data.ts:10` still uses `tank_id` while the SELECT in `Animal.data.ts:48` uses `enclosure_id`. This must be reconciled.

### Aquarium-Specific (Must Change)

| Area | File | What's Hardcoded |
|------|------|-----------------|
| **Database** | `common.data.ts:102` | Filename `aquario.db` |
| **Tables** | `Tank.data.ts` | Table names `tanks`, `tank_settings` |
| **State machine** | `System.model.ts:12–19` | All states are water operations: `DRAINING`, `FILLING_TANK`, `WATER_CHANGE_*` |
| **Service requests** | `System.model.ts:48–58` | All requests: `START_WATER_CHANGE`, `START_FILL_TANK`, `START_DRAIN_TANK`, etc. |
| **Service updates** | `System.model.ts:36–46` | All updates: `WATER_CHANGE_BEGAN`, `DRAIN_BEGAN`, `FILL_BEGAN`, etc. |
| **Maintenance status** | `Maintenance.model.ts:2–11` | All statuses: `DRAINING`, `FILLING`, `WATER_CHANGE_*` |
| **Maintenance logic** | `Maintenance.logic.ts` | Entire file: `waterChange()`, `drain()`, `fill()`, `resFill()` with relay control |
| **Maintenance controller** | `Maintenance.controller.ts` | Endpoints: `/change/:tankId`, `/fill/:tankId`, `/drain/:tankId` |
| **GPIO/hardware** | `common.data.ts:15–93` | Relay lines, float switch, `pollFloatSwitch()` |
| **WebSocket handler** | `common.data.ts:146–178` | Handles only water operations + water level |
| **Food types** | `FeedingDialog.tsx:36` | Hardcoded: `["Pellet", "Bloodworm", "Earthworm"]` |
| **Food types (iOS)** | `SystemEnums.swift:53–59` | Hardcoded: `Pellet`, `Bloodworm`, `Earthworm` |
| **Settings model** | `Tank.model.ts:33–43` | `drain_time`, `fill_time`, `res_fill_time`, `has_reservoir` |
| **UI labels** | Various | "Aquariums", "TankHub", "Tanks", "Water Conditions", "Tank Maintenance" |
| **Bonjour name** | `api/index.ts:65` | `"ExoPet Aquarium Controller"` |

---

## 2. Target Architecture

### Enclosure Type Registry

Every enclosure has a `type` string (e.g., `"aquarium"`, `"terrarium"`, `"vivarium"`, `"paludarium"`, `"aviary"`). The type determines:

1. **Which maintenance operations are available** — aquariums get water change/fill/drain; terrariums get misting/UV cycling; vivariums get misting + water change; etc.
2. **Which environmental parameters are monitored** — temperature (all), humidity (terrariums/vivariums), water level (aquariums), UV index (terrariums), etc.
3. **Which food types are offered** when logging a feeding — per-species or per-enclosure-type food lists.
4. **Which hardware peripherals are attached** — relays, sensors, switches mapped per enclosure.
5. **What the settings screen shows** — only relevant settings for that enclosure type.
6. **What the detail view shows** — only relevant maintenance controls and environmental readings.

### Conceptual Model

```
Enclosure (was Tank)
  ├── id, name, type
  ├── EnclosureSettings (type-specific fields)
  ├── EnclosureCapabilities (derived from type)
  │     ├── maintenance_operations: Operation[]
  │     ├── environmental_parameters: Parameter[]
  │     └── hardware_peripherals: Peripheral[]
  ├── Animals[]
  ├── Sensors[]
  └── Logs[]
```

### Operation Abstraction

Instead of hardcoded `waterChange/fill/drain`, operations become:

```typescript
interface MaintenanceOperation {
  id: string;                    // e.g., "water_change", "mist", "uv_cycle"
  label: string;                 // e.g., "Change Water", "Mist Enclosure", "UV Cycle"
  enclosure_types: string[];     // which enclosure types support this
  phases: OperationPhase[];      // ordered steps the operation goes through
  settings_keys: string[];       // which settings it needs (e.g., "drain_time")
  hardware: HardwareBinding[];   // which relays/sensors it uses
}

interface OperationPhase {
  id: string;                    // e.g., "draining", "filling"
  label: string;
  relay_line?: number;           // GPIO to activate
  duration_setting: string;      // settings key for duration
  stop_condition?: string;       // e.g., "float_switch_high"
}
```

---

## 3. Phase 1 — Rename & Unify (Non-Breaking)

**Goal:** Rename `Tank` → `Enclosure` throughout the codebase and reconcile the `tank_id`/`enclosure_id` inconsistency. This phase changes naming only — no behavioral changes.

### 3.1 Shared Models (`models/src/`)

#### `Tank.model.ts` → `Enclosure.model.ts`

```
Current:  export class Tank { ... }
          export interface TankSettings { ... tank_id?: string; }

Target:   export class Enclosure { ... }
          export interface EnclosureSettings { ... enclosure_id?: string; }
```

- Rename class `Tank` → `Enclosure`
- Rename interface `TankSettings` → `EnclosureSettings`
- Rename field `tank_id` → `enclosure_id`
- Re-export `Tank` as a deprecated alias for backward compatibility during migration:
  ```typescript
  /** @deprecated Use Enclosure */
  export const Tank = Enclosure;
  /** @deprecated Use EnclosureSettings */
  export type TankSettings = EnclosureSettings;
  ```

#### `Animal.model.ts`

- Remove legacy `tank_id` field (line 5)
- `enclosure_id` and `enclosure_type` remain (already correct)

#### `Maintenance.model.ts`

- No changes yet (Phase 3 replaces this entirely)

#### `models/index.ts`

- Update exports: `Enclosure`, `EnclosureSettings` (and deprecated aliases)

### 3.2 Database

#### Rename tables

```sql
ALTER TABLE tanks RENAME TO enclosures;
ALTER TABLE tank_settings RENAME TO enclosure_settings;
```

#### Rename columns

```sql
-- enclosure_settings
ALTER TABLE enclosure_settings RENAME COLUMN tank_id TO enclosure_id;

-- animals: drop tank_id if it exists, ensure enclosure_id exists
-- (SQLite doesn't support DROP COLUMN before 3.35.0, so may need to recreate table)
```

#### Rename database file

```
aquario.db → exopet.db
```

Update `common.data.ts:102`:
```typescript
filename: "exopet.db",
```

### 3.3 API Data Layer

#### `Tank.data.ts` → `Enclosure.data.ts`

- Rename class `TankDataManager` → `EnclosureDataManager`
- Update all SQL queries: `tanks` → `enclosures`, `tank_settings` → `enclosure_settings`
- Rename all `tankId` parameters → `enclosureId`
- Rename methods: `getAllTanks` → `getAllEnclosures`, `getTankData` → `getEnclosureData`, etc.

#### `Animal.data.ts`

- Line 10: Change `INSERT INTO animals (tank_id, ...)` → `INSERT INTO animals (enclosure_id, ...)`
- Line 6: Change `const { species, tank_id, ... }` → `const { species, enclosure_id, ... }`
- Rename method `getAnimalsForTank` → `getAnimalsForEnclosure`

#### `Maintenance.data.ts`

- Rename `setServiceStatus` to reference `enclosure_settings` table
- Update SQL: `UPDATE tank_settings` → `UPDATE enclosure_settings`

#### `Sensor.data.ts`

- Rename `getSensorsForTank` → `getSensorsForEnclosure`
- Parameter: `tankId` → `enclosureId`

### 3.4 API Controllers

#### `Tank.controller.ts` → `Enclosure.controller.ts`

- All routes stay the same paths for now (change paths in Phase 2)
- Rename internal references: `tankId` → `enclosureId`

#### `Maintenance.controller.ts`

- Rename parameters: `tankId` → `enclosureId`
- Keep endpoints functional (Phase 3 replaces)

#### `api/index.ts`

- Mount point: `app.use("/tank", ...)` → `app.use("/enclosure", ...)`
  - **OR:** Keep `/tank` as a deprecated alias and add `/enclosure` alongside
- Bonjour name: `"ExoPet Aquarium Controller"` → `"ExoPet Controller"`

### 3.5 API Logic

#### `Tank.logic.ts` → `Enclosure.logic.ts`

- Rename `TankManager` → `EnclosureManager`
- Rename parameters: `tankId` → `enclosureId`

#### `Notify.logic.ts`

- Line 38: Change `Tank \`${tankId}\`` → `Enclosure \`${enclosureId}\``

### 3.6 UI

#### DAL files

- `Tank.dal.ts` → `Enclosure.dal.ts`: Rename functions `getTanks` → `getEnclosures`, etc.
- Update API paths: `/tank/` → `/enclosure/`

#### Component/View renames

| Current | Target |
|---------|--------|
| `TankList.tsx` | `EnclosureList.tsx` |
| `TankDetail.tsx` | `EnclosureDetail.tsx` |
| `TankCard.tsx` | `EnclosureCard.tsx` |
| `AppBar/Tank.tsx` | `AppBar/Enclosure.tsx` |
| `AppBar/TankTemp.tsx` | `AppBar/EnclosureTemp.tsx` |
| `SettingsDialog.tsx` | `EnclosureSettingsDialog.tsx` |

#### Label changes

| Current | Target |
|---------|--------|
| "TankHub" | "ExoPet" |
| "Aquariums" | "Enclosures" |
| "Tanks" | "Enclosures" |
| "Tank Settings" | "Enclosure Settings" |
| "Tank Maintenance" | "Enclosure Maintenance" |
| "Water Conditions" | "Environment" |

### 3.7 iOS App

#### Model renames

| Current | Target |
|---------|--------|
| `Tank.swift` | `Enclosure.swift` (struct `Tank` → `Enclosure`) |
| `TankSettings.swift` | `EnclosureSettings.swift` |

#### View/ViewModel renames

| Current | Target |
|---------|--------|
| `TankListView.swift` | `EnclosureListView.swift` |
| `TankListViewModel.swift` | `EnclosureListViewModel.swift` |
| `TankDetailView.swift` | `EnclosureDetailView.swift` |
| `TankDetailViewModel.swift` | `EnclosureDetailViewModel.swift` |
| `TankCardView.swift` | `EnclosureCardView.swift` |
| `SettingsView.swift` | `EnclosureSettingsView.swift` |
| `SettingsViewModel.swift` | `EnclosureSettingsViewModel.swift` |

#### Route/navigation updates

- `HomeView.swift`: "Aquariums" → "Enclosures"
- `ContentView.swift`: Update `NavigationStack` routing for `Enclosure` type

---

## 4. Phase 2 — Enclosure Type System

**Goal:** Add an `enclosure_type` registry so the system knows what each enclosure can do.

### 4.1 New Model: `EnclosureType.model.ts`

```typescript
export interface EnclosureTypeDefinition {
  id: string;                          // "aquarium", "terrarium", "vivarium", etc.
  label: string;                       // Display name
  icon: string;                        // SF Symbol name (iOS) or MUI icon name (React)
  environmental_parameters: string[];  // ["temperature", "humidity", "uv_index", "water_level"]
  maintenance_operations: string[];    // ["water_change", "fill", "drain", "mist", "uv_cycle"]
  default_food_types: string[];        // Default food list for this type
  settings_schema: SettingsField[];    // Which settings fields appear
}

export interface SettingsField {
  key: string;             // e.g., "drain_time", "mist_duration"
  label: string;           // "Drain Duration", "Mist Duration"
  type: "slider" | "toggle" | "number";
  unit?: string;           // "seconds", "minutes", "%"
  min?: number;
  max?: number;
  step?: number;
  default?: number | boolean;
}
```

### 4.2 Built-in Type Definitions

#### Aquarium
```typescript
{
  id: "aquarium",
  label: "Aquarium",
  icon: "drop.fill",
  environmental_parameters: ["temperature", "water_level"],
  maintenance_operations: ["water_change", "fill", "drain"],
  default_food_types: ["Pellet", "Bloodworm", "Earthworm", "Flake", "Brine Shrimp"],
  settings_schema: [
    { key: "drain_time", label: "Drain Duration", type: "slider", unit: "seconds", min: 0, max: 1200, step: 5 },
    { key: "fill_time", label: "Fill Duration", type: "slider", unit: "seconds", min: 0, max: 1200, step: 5 },
    { key: "has_reservoir", label: "Reservoir Mode", type: "toggle" },
    { key: "res_fill_time", label: "Reservoir Fill Duration", type: "slider", unit: "seconds", min: 0, max: 1200, step: 5 },
    { key: "volume", label: "Volume", type: "number" },
    { key: "lower_temp_limit", label: "Lower Temp Limit", type: "number" },
    { key: "upper_temp_limit", label: "Upper Temp Limit", type: "number" },
  ]
}
```

#### Terrarium
```typescript
{
  id: "terrarium",
  label: "Terrarium",
  icon: "leaf.fill",
  environmental_parameters: ["temperature", "humidity"],
  maintenance_operations: ["mist", "uv_cycle"],
  default_food_types: ["Cricket", "Mealworm", "Dubia Roach", "Superworm", "Pinkie Mouse", "Leafy Greens", "Fruit"],
  settings_schema: [
    { key: "mist_duration", label: "Mist Duration", type: "slider", unit: "seconds", min: 0, max: 300, step: 5 },
    { key: "mist_interval", label: "Mist Interval", type: "slider", unit: "minutes", min: 30, max: 720, step: 30 },
    { key: "uv_on_hour", label: "UV On Hour", type: "number" },
    { key: "uv_off_hour", label: "UV Off Hour", type: "number" },
    { key: "target_humidity", label: "Target Humidity (%)", type: "number", min: 0, max: 100 },
    { key: "lower_temp_limit", label: "Lower Temp Limit", type: "number" },
    { key: "upper_temp_limit", label: "Upper Temp Limit", type: "number" },
  ]
}
```

#### Vivarium
```typescript
{
  id: "vivarium",
  label: "Vivarium",
  icon: "tortoise.fill",
  environmental_parameters: ["temperature", "humidity", "water_level"],
  maintenance_operations: ["water_change", "fill", "drain", "mist"],
  default_food_types: ["Cricket", "Fruit Fly", "Springtail", "Isopod", "Bloodworm", "Fruit"],
  settings_schema: [
    // Combines aquarium + terrarium settings
    { key: "drain_time", label: "Drain Duration", type: "slider", unit: "seconds", min: 0, max: 1200, step: 5 },
    { key: "fill_time", label: "Fill Duration", type: "slider", unit: "seconds", min: 0, max: 1200, step: 5 },
    { key: "mist_duration", label: "Mist Duration", type: "slider", unit: "seconds", min: 0, max: 300, step: 5 },
    { key: "target_humidity", label: "Target Humidity (%)", type: "number", min: 0, max: 100 },
    { key: "lower_temp_limit", label: "Lower Temp Limit", type: "number" },
    { key: "upper_temp_limit", label: "Upper Temp Limit", type: "number" },
  ]
}
```

#### Aviary
```typescript
{
  id: "aviary",
  label: "Aviary",
  icon: "bird.fill",
  environmental_parameters: ["temperature", "humidity"],
  maintenance_operations: ["mist"],
  default_food_types: ["Seed Mix", "Pellet", "Fruit", "Mealworm", "Nectar"],
  settings_schema: [
    { key: "mist_duration", label: "Mist Duration", type: "slider", unit: "seconds", min: 0, max: 300, step: 5 },
    { key: "lower_temp_limit", label: "Lower Temp Limit", type: "number" },
    { key: "upper_temp_limit", label: "Upper Temp Limit", type: "number" },
  ]
}
```

### 4.3 API Endpoint

```
GET /enclosure-types
```

Returns the full list of available enclosure type definitions. This drives the UI dynamically — no client-side hardcoding of enclosure capabilities.

### 4.4 Enclosure Creation Flow

When creating a new enclosure, the user picks an enclosure type first. The system then:
1. Creates the `enclosures` row with `type` set
2. Creates the `enclosure_settings` row with defaults from the type definition
3. UI shows only the relevant settings, maintenance controls, and food types

### 4.5 Database: `enclosure_settings` Schema Change

The current `enclosure_settings` table has fixed water-specific columns. Change to a flexible key-value approach **or** a wide table with nullable columns:

**Option A: Wide table (recommended for simplicity)**

```sql
CREATE TABLE enclosure_settings (
  id TEXT PRIMARY KEY,
  enclosure_id TEXT NOT NULL,

  -- Universal
  volume REAL,
  vol_unit TEXT DEFAULT 'gallons',
  lower_temp_limit REAL,
  upper_temp_limit REAL,

  -- Aquarium-specific
  drain_time REAL,
  fill_time REAL,
  res_fill_time REAL,
  has_reservoir INTEGER DEFAULT 0,

  -- Terrarium/Vivarium
  mist_duration REAL,
  mist_interval REAL,
  uv_on_hour INTEGER,
  uv_off_hour INTEGER,
  target_humidity REAL,

  -- Service state (universal)
  service_status INTEGER DEFAULT 0,

  FOREIGN KEY (enclosure_id) REFERENCES enclosures(id)
);
```

Unused columns for a given type remain `NULL`. The type definition's `settings_schema` controls which fields the UI exposes.

---

## 5. Phase 3 — Pluggable Maintenance Operations

**Goal:** Replace the hardcoded water change/fill/drain state machine with an abstract operation system.

### 5.1 Replace `System.model.ts` Enums

#### Current (water-only)
```typescript
export enum State {
  IDLE, DRAINING, FILLING_TANK, FILLING_RESERVOIR,
  WATER_CHANGE_DRAINING, WATER_CHANGE_FILLING_TANK, WATER_CHANGE_FILLING_RESERVOIR,
}
```

#### Target (generic)
```typescript
export enum State {
  IDLE = 0,
  OPERATING = 1,        // A maintenance operation is in progress
}

export interface OperationState {
  enclosure_id: string;
  operation_id: string;       // "water_change", "mist", "uv_cycle"
  current_phase: string;      // "draining", "filling", "misting"
  phase_index: number;        // 0-based index into operation's phases
  total_phases: number;
  progress_pct: number;       // 0–100
  started_at: string;         // ISO timestamp
  estimated_end: string;      // ISO timestamp
}
```

#### Service Requests → Generic

```typescript
export enum ServiceRequest {
  RESET_STATE = "reset_state",
  START_OPERATION = "start_operation",     // data: { enclosure_id, operation_id }
  CANCEL_OPERATION = "cancel_operation",   // data: { enclosure_id }
}
```

#### Service Updates → Generic

```typescript
export enum ServiceUpdate {
  STATE_RESET = "state_reset",
  OPERATION_BEGAN = "operation_began",           // data: { enclosure_id, operation_id, phases }
  PHASE_BEGAN = "phase_began",                   // data: { enclosure_id, phase_id, duration }
  PHASE_COMPLETE = "phase_complete",             // data: { enclosure_id, phase_id }
  OPERATION_COMPLETE = "operation_complete",      // data: { enclosure_id, operation_id }
}
```

#### Parameter Updates — Expand

```typescript
export enum ParameterUpdate {
  TEMPERATURE = "temperature",
  HUMIDITY = "humidity",
  WATER_LEVEL = "water_level",
  UV_INDEX = "uv_index",
  PH = "ph",
  OXYGEN = "oxygen",
}

export enum ParameterCheck {
  TEMPERATURE = "temperature",
  HUMIDITY = "humidity",
  WATER_LEVEL = "water_level",
  UV_INDEX = "uv_index",
  PH = "ph",
  OXYGEN = "oxygen",
}
```

### 5.2 Replace `Maintenance.model.ts`

```typescript
export namespace Maintenance {
  export enum Status {
    IDLE = 0,
    OPERATING = 1,
  }
}
```

The detailed state (which operation, which phase) is tracked in `OperationState`, not in the enum.

### 5.3 Replace `Maintenance.logic.ts`

The current file hardcodes `waterChange()`, `drain()`, `fill()`, `resFill()`. Replace with:

```typescript
export class MaintenanceManager {
  static activeOperations: Map<string, ActiveOperation> = new Map();

  static startOperation(enclosureId: string, operationDef: OperationDefinition, settings: EnclosureSettings): void {
    // 1. Look up operation phases from operationDef
    // 2. Start phase 0 (activate hardware via HardwareManager)
    // 3. Set timeout for phase duration
    // 4. On phase complete, start next phase or complete operation
    // 5. Broadcast updates via WebSocket
  }

  static cancelOperation(enclosureId: string): void {
    // 1. Stop active hardware
    // 2. Clear timeouts
    // 3. Broadcast STATE_RESET
  }
}
```

Where `OperationDefinition` comes from the enclosure type registry (see Phase 2) and `HardwareManager` handles the GPIO (see Phase 5).

### 5.4 Replace `Maintenance.controller.ts`

#### Current endpoints (aquarium-only)
```
GET /maintenance/change/:tankId
GET /maintenance/fill/:tankId
GET /maintenance/drain/:tankId
GET /maintenance/reset/:tankId
```

#### Target endpoints (generic)
```
POST /maintenance/:enclosureId/start    { operation_id: "water_change" | "mist" | ... }
POST /maintenance/:enclosureId/cancel
GET  /maintenance/:enclosureId/status
```

### 5.5 WebSocket Handler Update

In `common.data.ts`, the switch statement currently handles individual water operations. Replace with:

```typescript
case ServiceRequest.START_OPERATION:
  MaintenanceManager.startOperation(data.enclosure_id, data.operation_id, ...);
  break;
case ServiceRequest.CANCEL_OPERATION:
  MaintenanceManager.cancelOperation(data.enclosure_id);
  break;
```

---

## 6. Phase 4 — Configurable Food & Feeding

**Goal:** Replace hardcoded food types with per-enclosure-type or per-species food lists.

### 6.1 Current State

- `ui/src/components/FeedingDialog.tsx:36` — `["Pellet", "Bloodworm", "Earthworm"]`
- `ios/ExoPet/ExoPet/Models/SystemEnums.swift:53–59` — `enum FoodType { pellet, bloodworm, earthworm }`

### 6.2 Target: Food Types from Enclosure Type

The `EnclosureTypeDefinition.default_food_types` field (Phase 2) provides the food list. The feeding dialog reads this from the API instead of using hardcoded values.

### 6.3 Optional: Custom Food Types per Species

Add a `food_types` JSON column to the `animals` table:

```sql
ALTER TABLE animals ADD COLUMN food_types TEXT;
-- JSON array, e.g., '["Cricket", "Dubia Roach", "Leafy Greens"]'
-- NULL means "use enclosure type defaults"
```

When logging a feeding, the UI:
1. Checks `animal.food_types` — if set, uses that list
2. Otherwise, falls back to the enclosure type's `default_food_types`

### 6.4 API Change

```
GET /enclosure-types/:typeId/food-types    → string[]
GET /animal/:animalId/food-types           → string[] (merged: animal-specific + enclosure defaults)
```

### 6.5 UI/iOS Changes

- `FeedingDialog.tsx`: Remove hardcoded `foodTypes` array. Fetch from API or receive as prop.
- `FeedingDialogView.swift` / `FeedingDialogViewModel.swift`: Same — load food types from API.
- `SystemEnums.swift`: Remove `FoodType` enum entirely. Food types become dynamic strings.

---

## 7. Phase 5 — Hardware Abstraction Layer

**Goal:** Decouple GPIO/relay control from water-specific logic so different enclosure types can control different peripherals.

### 7.1 Current State

- `common.data.ts:15–21` — Hardcoded relay lines: `RELAY_1_LINE=26` (drain pump), `RELAY_2_LINE=20` (fill valve), `RELAY_3_LINE=21` (reservoir valve), `FLOAT_SWITCH_LINE=16`
- `Maintenance.logic.ts` — Directly calls `relayOn(RELAY_1_LINE)` etc.

### 7.2 New: `hardware_peripherals` Table

```sql
CREATE TABLE hardware_peripherals (
  id TEXT PRIMARY KEY,
  enclosure_id TEXT NOT NULL,
  peripheral_type TEXT NOT NULL,    -- "relay", "sensor", "switch"
  function TEXT NOT NULL,           -- "drain_pump", "fill_valve", "mist_nozzle", "uv_lamp", "float_switch"
  gpio_line INTEGER,                -- BCM pin number
  active_low INTEGER DEFAULT 1,     -- 1 = active-low relay, 0 = active-high
  FOREIGN KEY (enclosure_id) REFERENCES enclosures(id)
);
```

### 7.3 New: `HardwareManager`

```typescript
// api/logic/Hardware.logic.ts
export class HardwareManager {
  static async activate(enclosureId: string, function: string): Promise<void> {
    const peripheral = await getPeripheral(enclosureId, function);
    if (peripheral.active_low) {
      relayOn(peripheral.gpio_line);   // existing helper
    } else {
      relayOff(peripheral.gpio_line);
    }
  }

  static async deactivate(enclosureId: string, function: string): Promise<void> { ... }

  static async readSwitch(enclosureId: string, function: string): Promise<boolean> {
    const peripheral = await getPeripheral(enclosureId, function);
    return readGpio(peripheral.gpio_line) === 1;
  }
}
```

### 7.4 Operation Phases Reference Hardware by Function

Instead of `relayOn(RELAY_1_LINE)`, operation phases reference functions:

```typescript
// aquarium water_change operation definition
phases: [
  { id: "draining", hardware_function: "drain_pump", duration_setting: "drain_time" },
  { id: "filling",  hardware_function: "fill_valve", duration_setting: "fill_time", stop_condition: "float_switch" },
]
```

The `MaintenanceManager` calls `HardwareManager.activate(enclosureId, "drain_pump")` instead of `relayOn(RELAY_1_LINE)`.

### 7.5 Hardware Configuration UI

Add an admin/setup screen (or API endpoints) to map GPIO pins to enclosure peripherals. This enables the same Pi to control multiple enclosures with different hardware configurations.

---

## 8. Phase 6 — Environmental Monitoring Expansion

**Goal:** Support humidity, UV index, and other environmental parameters beyond temperature.

### 8.1 New Sensor Types

The `sensors` table already has a `sensor_type` column. Expand to support:

| sensor_type | Hardware | Read Method |
|-------------|----------|-------------|
| `temperature` | DS18B20 (1-Wire) | `/sys/bus/w1/devices/{id}/w1_slave` (existing) |
| `humidity` | DHT22 / SHT31 (I2C) | Python script or C library |
| `uv_index` | VEML6075 (I2C) | Python script |

### 8.2 `Sensor.data.ts` — Generic Read Method

```typescript
static readSensor = async (sensorId: string, sensorType: string): Promise<number | null> => {
  switch (sensorType) {
    case "temperature":
      return this.readTemperature(sensorId);  // existing 1-Wire
    case "humidity":
      return this.readHumidity(sensorId);     // new: I2C
    case "uv_index":
      return this.readUVIndex(sensorId);      // new: I2C
    default:
      return null;
  }
};
```

### 8.3 WebSocket: Broadcast All Parameters

Instead of only broadcasting `WATER_LEVEL` changes, poll and broadcast all relevant parameters for each enclosure:

```typescript
// Per enclosure, based on its type's environmental_parameters:
// - temperature: every 5s (existing)
// - humidity: every 10s
// - water_level: every 1s on change (existing)
// - uv_index: every 30s
```

### 8.4 UI: Environment Bar

Replace the temperature-only bar at the bottom with a multi-parameter environment bar:

```
┌──────────────────────────────────────────┐
│  🌡 27.3°C    💧 78%    ☀️ UV 4    💦 Full │
└──────────────────────────────────────────┘
```

Only shows parameters relevant to the enclosure type.

### 8.5 iOS: `EnvironmentBarView.swift`

Replace `TemperatureBarView` with `EnvironmentBarView` that dynamically shows readings based on the enclosure type's `environmental_parameters`.

---

## 9. Phase 7 — UI/iOS Adaptive Enclosure Views

**Goal:** The enclosure detail view adapts its controls and layout based on enclosure type.

### 9.1 Enclosure Detail — Dynamic Maintenance Controls

Instead of always showing "Change Water / Fill / Drain":

```swift
// iOS pseudo-code
ForEach(enclosureType.maintenance_operations) { operation in
  MaintenanceButton(
    label: operation.label,
    icon: operation.icon,
    action: { vm.startOperation(operation.id) }
  )
}
```

React equivalent:
```tsx
{enclosureType.maintenance_operations.map(op => (
  <MaintenanceButton key={op.id} label={op.label} onClick={() => startOperation(op.id)} />
))}
```

### 9.2 Enclosure Detail — Dynamic Environmental Display

Show readings for only the parameters this enclosure type tracks:

```swift
ForEach(enclosureType.environmental_parameters) { param in
  EnvironmentReading(parameter: param, value: vm.readings[param])
}
```

### 9.3 Settings View — Dynamic Fields

Generate the settings form from `enclosureType.settings_schema`:

```swift
ForEach(enclosureType.settings_schema) { field in
  switch field.type {
    case "slider": SliderField(field: field, value: $vm.settings[field.key])
    case "toggle": ToggleField(field: field, value: $vm.settings[field.key])
    case "number": NumberField(field: field, value: $vm.settings[field.key])
  }
}
```

### 9.4 Enclosure Card — Type Indicator

The enclosure card in the list view should show the enclosure type with an icon:

```
┌─────────────────────────┐
│ 🐠 Reef Tank            │
│ Aquarium                 │
│              [Manage]    │
└─────────────────────────┘
┌─────────────────────────┐
│ 🦎 Gecko Habitat        │
│ Terrarium                │
│              [Manage]    │
└─────────────────────────┘
```

### 9.5 Home View

Change navigation from "Aquariums" / "Animals" to "Enclosures" / "Animals".

Consider adding enclosure type filters on the enclosure list view if the user has many enclosures of different types.

---

## 10. Phase 8 — Cloud Backup & Sync

**Goal:** Add cloud-backed data persistence with eventual consistency, so SQLite remains the local source of truth on the Pi (critical for offline hardware control) while Firestore provides backup, cross-device sync, and the foundation for remote access.

### 10.1 Why This Architecture

The Pi controls physical hardware (relays, sensors, float switches). It **must** operate without internet. A cloud-first architecture would mean a network outage could prevent a water change or miss a temperature alert. Instead:

- **SQLite stays primary.** The Pi reads/writes SQLite for all local operations — zero latency, zero internet dependency.
- **Firestore is a cloud mirror.** Local mutations are pushed to Firestore asynchronously. Firestore changes from remote clients are pulled to SQLite.
- **Eventual consistency.** Local and cloud may diverge briefly (seconds to minutes), but converge automatically. Hardware state is always authoritative from the Pi.

### 10.2 Why Firebase/Firestore

| Requirement | Firebase Offering |
|-------------|-------------------|
| Affordable | Spark (free) plan: 1 GiB storage, 50K reads/day, 20K writes/day — more than sufficient for a single-household deployment |
| Easy setup | No server to provision; SDK handles auth, sync, offline |
| Real-time listeners | Firestore `onSnapshot` provides instant push to remote clients |
| Auth | Firebase Auth (email/password or Apple Sign-In) — needed for multi-user household |
| Push notifications | Firebase Cloud Messaging (FCM) + APNs for iOS alerts |
| Scales later | If ExoPet becomes multi-household (e.g., a zookeeper managing 50 enclosures), Blaze (pay-as-you-go) scaling is straightforward |

### 10.3 Firebase Project Setup

```
Firebase project: exopet
├── Authentication (email/password + Apple Sign-In)
├── Firestore Database
│   ├── /devices/{deviceId}                     — Pi registration
│   ├── /devices/{deviceId}/enclosures/{id}     — Enclosure data + settings
│   ├── /devices/{deviceId}/animals/{id}         — Animal data
│   ├── /devices/{deviceId}/logs/{id}            — Feeding & maintenance logs
│   ├── /devices/{deviceId}/sensors/{id}         — Sensor registry
│   ├── /devices/{deviceId}/readings/{id}        — Time-series environmental data (sampled)
│   └── /devices/{deviceId}/commands/{id}        — Remote commands (Phase 9)
├── Cloud Messaging (FCM)
└── Security Rules
```

### 10.4 Firestore Document Schemas

#### `/devices/{deviceId}`

```typescript
{
  name: string;              // "Living Room Pi", "Garage Pi"
  owner_uid: string;         // Firebase Auth UID
  last_seen: Timestamp;      // Heartbeat — updated every 60s by the Pi
  api_version: string;       // "1.0"
  local_ip: string;          // "192.168.5.215" — for LAN fallback
  local_port: number;        // 3001
  created_at: Timestamp;
}
```

#### `/devices/{deviceId}/enclosures/{id}`

Mirrors the SQLite `enclosures` + `enclosure_settings` tables:

```typescript
{
  name: string;
  type: string;              // "aquarium", "terrarium", etc.
  service_status: number;
  settings: {                // Embedded, not a subcollection
    volume: number | null;
    drain_time: number | null;
    fill_time: number | null;
    // ... all settings fields
  };
  updated_at: Timestamp;     // For conflict resolution
  synced_at: Timestamp;      // When Pi last confirmed this version
}
```

#### `/devices/{deviceId}/animals/{id}`

```typescript
{
  name: string;
  species: string;
  species_latin: string;
  notes: string;
  enclosure_id: string;
  enclosure_type: string;
  food_types: string[] | null;
  last_feeding_log: {
    timestamp: Timestamp;
    food_type: string;
    food_quantity: number;
  } | null;
  updated_at: Timestamp;
}
```

#### `/devices/{deviceId}/logs/{id}`

```typescript
{
  action_type: string;       // "Feeding", "Water Change", "Maintenance"
  animal_id: string | null;
  container_id: string;
  log_json: string;          // JSON string (matches current format)
  timestamp: Timestamp;
  source: "local" | "remote"; // Who created this log
}
```

#### `/devices/{deviceId}/readings/{id}`

Sampled environmental readings for historical graphs (not every 5s poll — sampled at configurable intervals):

```typescript
{
  enclosure_id: string;
  parameter: string;         // "temperature", "humidity", "water_level"
  value: number;
  timestamp: Timestamp;
}
```

**Sampling strategy:** Store one reading per parameter per enclosure every 15 minutes. At 4/hour x 24h x 3 parameters = 288 writes/day per enclosure. Well within free tier.

### 10.5 Sync Engine: Pi Side (`api/services/CloudSync.service.ts`)

A new service running inside the Express API process on the Pi.

#### Outbound Sync (SQLite → Firestore)

```typescript
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

export class CloudSyncService {
  private db: FirebaseFirestore.Firestore;
  private deviceId: string;
  private syncInterval: NodeJS.Timeout;

  // --- Change tracking ---
  // Option A: Polling-based (simpler, recommended for v1)
  // A `sync_meta` table tracks last-sync timestamps per table.
  // On each sync cycle, query rows WHERE updated_at > last_sync.

  // Option B: Trigger-based (more efficient, Phase 2 of cloud work)
  // SQLite triggers write to a `change_log` table on INSERT/UPDATE/DELETE.
  // Sync engine reads and drains the change_log.

  async startOutboundSync(intervalMs: number = 30000): Promise<void> {
    this.syncInterval = setInterval(async () => {
      await this.pushEnclosures();
      await this.pushAnimals();
      await this.pushLogs();
      await this.pushReadings();
      await this.heartbeat();
    }, intervalMs);
  }

  private async pushEnclosures(): Promise<void> {
    const lastSync = await this.getLastSync("enclosures");
    const changed = await db.all(
      "SELECT * FROM enclosures WHERE updated_at > ?", lastSync
    );
    const batch = this.db.batch();
    for (const enc of changed) {
      const ref = this.db.doc(`devices/${this.deviceId}/enclosures/${enc.id}`);
      batch.set(ref, { ...enc, synced_at: Timestamp.now() }, { merge: true });
    }
    await batch.commit();
    await this.setLastSync("enclosures");
  }

  // ... similar for animals, logs, readings
}
```

#### Inbound Sync (Firestore → SQLite)

```typescript
  async startInboundSync(): Promise<void> {
    // Listen for remote changes to animals (edits from iOS app)
    this.db.collection(`devices/${this.deviceId}/animals`)
      .onSnapshot((snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === "modified") {
            const data = change.doc.data();
            // Only apply if remote updated_at > local updated_at
            this.applyAnimalUpdate(change.doc.id, data);
          }
        }
      });

    // Listen for remote commands (Phase 9)
    this.db.collection(`devices/${this.deviceId}/commands`)
      .where("status", "==", "pending")
      .onSnapshot((snapshot) => { ... });
  }
```

#### Conflict Resolution

| Scenario | Resolution |
|----------|------------|
| Both Pi and remote edit the same animal | **Last-write-wins** using `updated_at` timestamp. Firestore and SQLite both store `updated_at`. Whichever is newer wins. |
| Remote edits animal while Pi is offline | Pi comes back online, pulls Firestore changes. If no local edits, remote wins. If conflicting local edits, compare timestamps. |
| Hardware state (service_status, readings) | **Pi always wins.** The Pi is the source of truth for physical hardware state. Remote clients never directly set `service_status` — they send commands (Phase 9). |
| Log entries | **No conflict.** Logs are append-only. Both sides create logs with unique UUIDs; sync merges both. |
| Enclosure settings | **Last-write-wins.** User edits settings from either the kiosk UI or the iOS app. The most recent `updated_at` wins. |

### 10.6 SQLite Schema Changes for Sync

#### Add `updated_at` columns

Every syncable table needs an `updated_at` column:

```sql
ALTER TABLE enclosures ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE enclosure_settings ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE animals ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
-- logs already have `timestamp`; use that
```

#### Add triggers to auto-update `updated_at`

```sql
CREATE TRIGGER enclosures_updated AFTER UPDATE ON enclosures
BEGIN
  UPDATE enclosures SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER animals_updated AFTER UPDATE ON animals
BEGIN
  UPDATE animals SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER enclosure_settings_updated AFTER UPDATE ON enclosure_settings
BEGIN
  UPDATE enclosure_settings SET updated_at = datetime('now') WHERE enclosure_id = NEW.enclosure_id;
END;
```

#### Add `sync_meta` table

```sql
CREATE TABLE sync_meta (
  table_name TEXT PRIMARY KEY,
  last_sync_at TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'
);

INSERT INTO sync_meta (table_name) VALUES ('enclosures'), ('animals'), ('logs'), ('readings');
```

### 10.7 API Dependencies

Add to `api/package.json`:

```json
{
  "firebase-admin": "^12.0.0"
}
```

Firebase Admin SDK (not the client SDK) is used on the Pi because:
- It authenticates with a service account key, not user credentials
- It has full read/write access regardless of security rules
- It supports real-time listeners via `onSnapshot`

#### Configuration

New `.env` variables:

```
FIREBASE_PROJECT_ID=exopet
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
EXOPET_DEVICE_ID=<uuid>
CLOUD_SYNC_ENABLED=true
CLOUD_SYNC_INTERVAL_MS=30000
READING_SAMPLE_INTERVAL_MS=900000
```

The `firebase-service-account.json` file is generated from Firebase Console > Project Settings > Service Accounts. It should be `.gitignored`.

### 10.8 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Device documents: only the owner can read/write
    match /devices/{deviceId} {
      allow read, write: if request.auth != null
        && resource.data.owner_uid == request.auth.uid;

      // Subcollections inherit the device ownership check
      match /{subcollection}/{docId} {
        allow read: if request.auth != null
          && get(/databases/$(database)/documents/devices/$(deviceId)).data.owner_uid == request.auth.uid;

        // Animals and settings: owner can write (remote edits)
        allow write: if request.auth != null
          && get(/databases/$(database)/documents/devices/$(deviceId)).data.owner_uid == request.auth.uid;
      }
    }
  }
}
```

Note: The Pi uses the Admin SDK, which bypasses security rules entirely. These rules protect against unauthorized access from client apps.

### 10.9 iOS App: Firebase Integration

#### Dependencies

Add Firebase iOS SDK via Swift Package Manager:
- `FirebaseAuth`
- `FirebaseFirestore`
- `FirebaseMessaging`

#### Data Source Strategy

The iOS app has two data paths:

```
┌─────────────────────────────────────────────────┐
│                   iOS App                        │
│                                                  │
│   ┌─────────────────────────────────────────┐   │
│   │         DataSourceManager                │   │
│   │                                          │   │
│   │   if (on local network && Pi reachable)  │   │
│   │     → use REST API + WebSocket (fast)    │   │
│   │   else                                   │   │
│   │     → use Firestore (remote, eventual)   │   │
│   │                                          │   │
│   └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

New file: `Services/DataSourceManager.swift`

```swift
@MainActor
class DataSourceManager: ObservableObject {
    enum Mode {
        case local(ServerInfo)   // On LAN — use REST + WebSocket
        case remote(String)      // Off LAN — use Firestore (deviceId)
        case offline             // No connectivity at all — cached data only
    }

    @Published var mode: Mode = .offline
    private let firestoreService: FirestoreService
    private let apiService: APIService

    // Periodically check if Pi is reachable on LAN
    // If yes → switch to .local (lower latency, real-time WS)
    // If no → switch to .remote (Firestore)
}
```

#### Auth Flow

1. App launches → check Firebase Auth state
2. If not signed in → show sign-in screen (email/password or Apple Sign-In)
3. If signed in → query Firestore for `/devices` where `owner_uid == auth.uid`
4. Show device list (where each device is a Pi)
5. User selects device → attempt LAN discovery (Bonjour)
6. If on LAN → connect directly (existing flow, fast)
7. If not on LAN → connect via Firestore (cloud mode)

#### Firestore Service (`Services/FirestoreService.swift`)

```swift
class FirestoreService {
    private let db = Firestore.firestore()
    private let deviceId: String

    func getEnclosures() async throws -> [Enclosure] {
        let snapshot = try await db
            .collection("devices/\(deviceId)/enclosures")
            .getDocuments()
        return snapshot.documents.compactMap { try? $0.data(as: Enclosure.self) }
    }

    func getAnimals() async throws -> [Animal] { ... }

    func updateAnimal(_ id: String, fields: AnimalUpdateFields) async throws {
        try await db.document("devices/\(deviceId)/animals/\(id)")
            .updateData([
                "name": fields.name,
                "species": fields.species,
                // ...
                "updated_at": FieldValue.serverTimestamp()
            ])
    }

    func addFeedingLog(_ log: FeedingLog) async throws {
        try await db.collection("devices/\(deviceId)/logs")
            .addDocument(data: [
                "action_type": "Feeding",
                "animal_id": log.animalId,
                "container_id": log.enclosureId,
                "log_json": log.jsonString,
                "timestamp": FieldValue.serverTimestamp(),
                "source": "remote"
            ])
    }

    // Real-time listeners for enclosure state
    func observeEnclosure(_ id: String, handler: @escaping (Enclosure) -> Void) -> ListenerRegistration {
        return db.document("devices/\(deviceId)/enclosures/\(id)")
            .addSnapshotListener { snapshot, error in
                guard let data = try? snapshot?.data(as: Enclosure.self) else { return }
                handler(data)
            }
    }

    func observeReadings(_ enclosureId: String, parameter: String, handler: @escaping ([Reading]) -> Void) -> ListenerRegistration {
        return db.collection("devices/\(deviceId)/readings")
            .whereField("enclosure_id", isEqualTo: enclosureId)
            .whereField("parameter", isEqualTo: parameter)
            .order(by: "timestamp", descending: true)
            .limit(to: 50)
            .addSnapshotListener { snapshot, error in
                let readings = snapshot?.documents.compactMap { try? $0.data(as: Reading.self) } ?? []
                handler(readings)
            }
    }
}
```

### 10.10 React UI: Firebase Integration (Optional)

The kiosk Electron UI runs on the same LAN as the Pi, so it always uses the REST API directly. Firebase integration for the React UI is optional and only needed if you want a web-based remote dashboard later.

If desired, add `firebase` (client SDK) to `ui/package.json` and create a `FirestoreService` DAL class mirroring the iOS approach.

### 10.11 Historical Data & Graphs

With readings stored in Firestore, both the iOS app and any future web dashboard can display historical environmental graphs:

- **Temperature over 24h / 7d / 30d**
- **Humidity trends**
- **Feeding frequency per animal**
- **Maintenance history per enclosure**

Firestore queries like `WHERE timestamp > X ORDER BY timestamp` are efficient with composite indexes.

#### Data Retention

To keep Firestore storage within free tier limits:
- Keep detailed readings (15-min samples) for 30 days
- Aggregate to hourly averages and keep for 1 year
- A Firebase Cloud Function (or a cron job on the Pi) handles aggregation and cleanup:

```typescript
// Runs daily: aggregate yesterday's readings into hourly averages, delete raw
async function aggregateReadings() {
  const yesterday = Timestamp.fromDate(subtractDays(new Date(), 1));
  const readings = await db.collection(`devices/${deviceId}/readings`)
    .where("timestamp", "<", yesterday)
    .get();

  // Group by enclosure + parameter + hour, average values
  // Write to /devices/{deviceId}/readings_hourly/{id}
  // Delete originals
}
```

---

## 11. Phase 9 — Remote Access & Push Notifications

**Goal:** Allow users to monitor and control enclosures from anywhere (not just on the LAN), and receive push notifications for critical alerts.

### 11.1 Remote Command System

When the iOS app is off-LAN, it cannot reach the Pi's REST API or WebSocket. Instead, it writes **commands** to Firestore, which the Pi picks up via its inbound sync listener.

#### `/devices/{deviceId}/commands/{id}` Schema

```typescript
{
  type: string;              // "start_operation", "cancel_operation", "update_settings"
  enclosure_id: string;
  payload: any;              // Operation-specific data
  status: "pending" | "acknowledged" | "completed" | "failed";
  created_at: Timestamp;     // When remote client sent it
  completed_at: Timestamp;   // When Pi executed it
  result: any;               // Pi writes result here
  source_uid: string;        // Firebase Auth UID of sender
}
```

#### Command Types

| Command | Payload | Pi Action |
|---------|---------|-----------|
| `start_operation` | `{ operation_id: "water_change" }` | Calls `MaintenanceManager.startOperation(...)` |
| `cancel_operation` | `{}` | Calls `MaintenanceManager.cancelOperation(...)` |
| `update_settings` | `{ settings: { drain_time: 120, ... } }` | Calls `EnclosureDataManager.updateSettings(...)` |
| `update_animal` | `{ name: "Nemo", species: "Clownfish" }` | Calls `AnimalDataManager.updateAnimal(...)` |
| `add_feeding_log` | `{ animal_id, log_json }` | Calls `LogDataManager.addLog(...)` |

#### Pi Command Listener

```typescript
// In CloudSyncService
async startCommandListener(): Promise<void> {
  this.db.collection(`devices/${this.deviceId}/commands`)
    .where("status", "==", "pending")
    .onSnapshot(async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "added") {
          const cmd = change.doc.data();
          await this.executeCommand(change.doc.id, cmd);
        }
      }
    });
}

private async executeCommand(cmdId: string, cmd: Command): Promise<void> {
  // Mark as acknowledged
  await this.db.doc(`devices/${this.deviceId}/commands/${cmdId}`)
    .update({ status: "acknowledged" });

  try {
    switch (cmd.type) {
      case "start_operation":
        await MaintenanceManager.startOperation(cmd.enclosure_id, cmd.payload.operation_id);
        break;
      case "cancel_operation":
        await MaintenanceManager.cancelOperation(cmd.enclosure_id);
        break;
      case "update_settings":
        await EnclosureDataManager.updateSettings(cmd.enclosure_id, cmd.payload.settings);
        break;
      // ...
    }
    await this.db.doc(`devices/${this.deviceId}/commands/${cmdId}`)
      .update({ status: "completed", completed_at: Timestamp.now() });
  } catch (error) {
    await this.db.doc(`devices/${this.deviceId}/commands/${cmdId}`)
      .update({ status: "failed", result: { error: error.message } });
  }
}
```

#### iOS Command Sender

```swift
// In FirestoreService
func sendCommand(type: String, enclosureId: String, payload: [String: Any] = [:]) async throws -> String {
    let ref = try await db.collection("devices/\(deviceId)/commands")
        .addDocument(data: [
            "type": type,
            "enclosure_id": enclosureId,
            "payload": payload,
            "status": "pending",
            "created_at": FieldValue.serverTimestamp(),
            "source_uid": Auth.auth().currentUser?.uid ?? ""
        ])
    return ref.documentID
}

// Then observe the command doc for status changes:
func observeCommand(_ commandId: String, handler: @escaping (String) -> Void) -> ListenerRegistration {
    return db.document("devices/\(deviceId)/commands/\(commandId)")
        .addSnapshotListener { snapshot, _ in
            if let status = snapshot?.data()?["status"] as? String {
                handler(status)
            }
        }
}
```

### 11.2 Remote Mode UX

When the iOS app connects via Firestore (not LAN), the UI should clearly indicate:

```
┌──────────────────────────────────────┐
│  ☁️ Remote Mode — Updates may be     │
│     delayed by a few seconds         │
└──────────────────────────────────────┘
```

Key UX differences in remote mode:

| Feature | Local (LAN) | Remote (Cloud) |
|---------|-------------|----------------|
| Data freshness | Real-time (WebSocket) | Near-real-time (Firestore listeners, ~1-3s delay) |
| Maintenance operations | Instant feedback | Command → acknowledge → complete cycle (2-5s) |
| Temperature readings | Live polling every 5s | Sampled every 15min (with latest from Pi heartbeat) |
| Feeding logs | Instant save | Eventual sync (seconds) |
| Settings changes | Instant apply | Command-based (2-5s) |

The maintenance controls should show a spinner or "Sending..." state in remote mode while waiting for the Pi to acknowledge the command.

### 11.3 Push Notifications via Firebase Cloud Messaging (FCM)

Replace (or supplement) the current Discord webhook notifications with iOS push notifications.

#### Current State

`Notify.logic.ts` sends temperature alerts to Discord:
```typescript
// api/logic/Notify.logic.ts:14
await fetch(DISCORD_WEBHOOK_URL, { method: "POST", ... });
```

#### Target: FCM Notifications

Add FCM alongside Discord (keep Discord as a fallback/secondary):

```typescript
import { getMessaging } from "firebase-admin/messaging";

export class NotifyManager {
  // ... existing Discord methods ...

  static sendPushNotification = async (
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> => {
    const tokens = await this.getRegisteredTokens();
    if (tokens.length === 0) return;

    const messaging = getMessaging();
    await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: data || {},
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          }
        }
      }
    });
  };

  static checkTemperature = async (
    enclosureId: string,
    average: number,
    lowerLimit?: number,
    upperLimit?: number
  ): Promise<void> => {
    // ... existing cooldown logic ...

    if (upperLimit && average > upperLimit) {
      const msg = `Enclosure is too HOT! ${average.toFixed(1)}°C (limit: ${upperLimit}°C)`;
      await this.sendDiscord(`🌡️ **Temperature Alert** — ${msg}`);
      await this.sendPushNotification(
        "Temperature Alert",
        msg,
        { enclosure_id: enclosureId, alert_type: "temperature_high" }
      );
    }

    // ... similar for cold ...
  };

  // Feeding reminders
  static checkFeedingOverdue = async (
    animalName: string,
    animalId: string,
    hoursSinceFeeding: number
  ): Promise<void> => {
    if (hoursSinceFeeding >= 72) {
      await this.sendPushNotification(
        "Feeding Overdue",
        `${animalName} hasn't been fed in ${Math.floor(hoursSinceFeeding)} hours!`,
        { animal_id: animalId, alert_type: "feeding_overdue" }
      );
    }
  };

  // Device offline alert (from a Cloud Function, not the Pi itself)
  // See 11.4 below
}
```

#### FCM Token Storage

When the iOS app registers for push notifications, it stores its FCM token in Firestore:

```typescript
// Firestore document
/devices/{deviceId}/fcm_tokens/{tokenId}
{
  token: string;
  platform: "ios" | "android" | "web";
  created_at: Timestamp;
  user_uid: string;
}
```

The Pi reads these tokens when sending notifications.

#### iOS Registration (`ExoPetApp.swift`)

```swift
import FirebaseMessaging

class AppDelegate: NSObject, UIApplicationDelegate, MessagingDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions ...) -> Bool {
        Messaging.messaging().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, _ in }
        application.registerForRemoteNotifications()
        return true
    }

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken, let deviceId = UserDefaults.standard.string(forKey: "selectedDeviceId") else { return }
        Firestore.firestore().collection("devices/\(deviceId)/fcm_tokens")
            .document(token.prefix(20).description)
            .setData([
                "token": token,
                "platform": "ios",
                "created_at": FieldValue.serverTimestamp(),
                "user_uid": Auth.auth().currentUser?.uid ?? ""
            ])
    }
}
```

### 11.4 Device Offline Detection (Cloud Function)

The Pi can't send "I'm offline" when it's... offline. A lightweight Firebase Cloud Function monitors the `last_seen` heartbeat:

```typescript
// functions/src/index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();

export const checkDeviceHealth = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async () => {
    const db = admin.firestore();
    const fiveMinutesAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 5 * 60 * 1000)
    );

    const staleDevices = await db.collection("devices")
      .where("last_seen", "<", fiveMinutesAgo)
      .get();

    for (const doc of staleDevices.docs) {
      const device = doc.data();
      const tokens = await db.collection(`devices/${doc.id}/fcm_tokens`).get();
      const tokenList = tokens.docs.map(t => t.data().token);

      if (tokenList.length > 0) {
        await admin.messaging().sendEachForMulticast({
          tokens: tokenList,
          notification: {
            title: "Device Offline",
            body: `${device.name} hasn't reported in over 5 minutes. Check your network connection.`,
          },
          data: { device_id: doc.id, alert_type: "device_offline" },
        });
      }
    }
  });
```

This requires the **Blaze plan** (pay-as-you-go) for Cloud Functions, but usage at this scale would cost pennies per month.

### 11.5 Notification Types Summary

| Alert | Source | Channel |
|-------|--------|---------|
| Temperature too high/low | Pi (`Notify.logic.ts`) | Discord + FCM push |
| Feeding overdue (72h+) | Pi (periodic check) | FCM push |
| Maintenance operation complete | Pi (`MaintenanceManager`) | FCM push (optional) |
| Device offline | Cloud Function | FCM push |
| Remote command failed | Pi (command executor) | Firestore status update → iOS observes |

### 11.6 Multi-Device / Multi-User Support

The Firestore architecture inherently supports multiple Pis and multiple users:

- **Multiple Pis:** Each Pi registers as a separate `/devices/{deviceId}`. The iOS app shows a device picker. A user can own multiple devices (e.g., one in the living room, one in the greenhouse).
- **Shared access:** Add a `shared_uids: string[]` field to the device document. Update security rules to allow both `owner_uid` and users in `shared_uids` to read/write. This enables household members to share access.
- **Multi-household (future):** Each household gets its own Firebase project, or a single project with tenant isolation — but this is beyond the current scope.

### 11.7 Cost Estimate (Firebase Spark → Blaze)

| Feature | Spark (Free) | Blaze (Pay-as-you-go) |
|---------|-------------|----------------------|
| Firestore reads | 50K/day | $0.06/100K |
| Firestore writes | 20K/day | $0.18/100K |
| Firestore storage | 1 GiB | $0.18/GiB/month |
| Auth | 10K users/month | 10K users/month (free) |
| FCM | Unlimited | Unlimited |
| Cloud Functions | N/A | $0.40/million invocations |

**For a single-household deployment** (1-3 Pis, 5-15 enclosures, 2-3 users):
- ~500 writes/day (readings, logs, heartbeats) — well within Spark free tier
- ~2000 reads/day (iOS app queries, listeners) — well within Spark free tier
- ~50 MB storage after 1 year — well within 1 GiB free tier
- Cloud Functions for offline detection: ~$0.01/month on Blaze

You can run entirely on the **Spark (free) plan** without Cloud Functions, and only upgrade to Blaze if you want the offline detection Cloud Function. FCM push notifications work on both plans.

---

## 12. Database Migration Scripts

### Migration 001: Rename tables and columns

```sql
-- Step 1: Rename tables
ALTER TABLE tanks RENAME TO enclosures;
ALTER TABLE tank_settings RENAME TO enclosure_settings;

-- Step 2: Rename columns (SQLite 3.25+ supports this)
ALTER TABLE enclosure_settings RENAME COLUMN tank_id TO enclosure_id;

-- Step 3: Handle animals.tank_id → enclosure_id
-- If SQLite < 3.35.0 (no DROP COLUMN), recreate:
CREATE TABLE animals_new (
  id TEXT PRIMARY KEY,
  enclosure_id TEXT,
  enclosure_type TEXT,
  name TEXT,
  species TEXT,
  species_latin TEXT,
  notes TEXT
);
INSERT INTO animals_new (id, enclosure_id, enclosure_type, name, species, species_latin, notes)
  SELECT id, COALESCE(enclosure_id, tank_id), enclosure_type, name, species, species_latin, notes
  FROM animals;
DROP TABLE animals;
ALTER TABLE animals_new RENAME TO animals;
```

### Migration 002: Add new settings columns

```sql
ALTER TABLE enclosure_settings ADD COLUMN mist_duration REAL;
ALTER TABLE enclosure_settings ADD COLUMN mist_interval REAL;
ALTER TABLE enclosure_settings ADD COLUMN uv_on_hour INTEGER;
ALTER TABLE enclosure_settings ADD COLUMN uv_off_hour INTEGER;
ALTER TABLE enclosure_settings ADD COLUMN target_humidity REAL;
```

### Migration 003: Add hardware peripherals table

```sql
CREATE TABLE hardware_peripherals (
  id TEXT PRIMARY KEY,
  enclosure_id TEXT NOT NULL,
  peripheral_type TEXT NOT NULL,
  function TEXT NOT NULL,
  gpio_line INTEGER,
  active_low INTEGER DEFAULT 1,
  FOREIGN KEY (enclosure_id) REFERENCES enclosures(id)
);

-- Seed with current aquarium hardware mappings
INSERT INTO hardware_peripherals (id, enclosure_id, peripheral_type, function, gpio_line, active_low)
SELECT
  lower(hex(randomblob(16))),
  id,
  'relay',
  'drain_pump',
  26,
  1
FROM enclosures WHERE type = 'aquarium';

-- (repeat for fill_valve=20, reservoir_valve=21, float_switch=16)
```

### Migration 004: Add food_types to animals

```sql
ALTER TABLE animals ADD COLUMN food_types TEXT;
-- NULL = use enclosure type defaults
```

### Migration 005: Add sync support columns

```sql
-- updated_at for change tracking
ALTER TABLE enclosures ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE enclosure_settings ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE animals ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- Auto-update triggers
CREATE TRIGGER enclosures_updated AFTER UPDATE ON enclosures
BEGIN
  UPDATE enclosures SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER animals_updated AFTER UPDATE ON animals
BEGIN
  UPDATE animals SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER enclosure_settings_updated AFTER UPDATE ON enclosure_settings
BEGIN
  UPDATE enclosure_settings SET updated_at = datetime('now') WHERE enclosure_id = NEW.enclosure_id;
END;

-- Sync metadata
CREATE TABLE sync_meta (
  table_name TEXT PRIMARY KEY,
  last_sync_at TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'
);

INSERT INTO sync_meta (table_name) VALUES ('enclosures'), ('animals'), ('logs'), ('readings');
```

---

## 13. File-by-File Change Index

### Shared Models (`models/src/`)

| File | Phase | Changes |
|------|-------|---------|
| `Tank.model.ts` → `Enclosure.model.ts` | 1 | Rename class, interface, field; add deprecated aliases |
| `Animal.model.ts` | 1 | Remove `tank_id` field |
| `System.model.ts` | 3 | Replace all enums with generic operation/phase model |
| `Maintenance.model.ts` | 3 | Simplify to `IDLE`/`OPERATING` |
| NEW: `EnclosureType.model.ts` | 2 | Enclosure type definitions |
| NEW: `Operation.model.ts` | 3 | `OperationDefinition`, `OperationPhase`, `OperationState` |
| `index.ts` | 1 | Update exports |

### API Data Layer (`api/data/`)

| File | Phase | Changes |
|------|-------|---------|
| `common.data.ts` | 1, 3, 5 | Rename DB file; abstract WebSocket handler; extract GPIO to HardwareManager |
| `Tank.data.ts` → `Enclosure.data.ts` | 1 | Rename class, methods, SQL table references |
| `Animal.data.ts` | 1 | Fix `tank_id` → `enclosure_id` in INSERT; rename methods |
| `Maintenance.data.ts` | 1 | Update SQL table references |
| `Sensor.data.ts` | 1, 6 | Rename methods; add generic `readSensor()` |
| NEW: `Hardware.data.ts` | 5 | CRUD for `hardware_peripherals` table |

### API Logic (`api/logic/`)

| File | Phase | Changes |
|------|-------|---------|
| `Tank.logic.ts` → `Enclosure.logic.ts` | 1 | Rename class, parameters |
| `Maintenance.logic.ts` | 3 | Replace with generic `startOperation`/`cancelOperation` |
| `Log.logic.ts` | 1 | Rename `waterChange` → generic maintenance log |
| NEW: `Hardware.logic.ts` | 5 | `HardwareManager` class |
| NEW: `CloudSync.service.ts` | 8 | Outbound/inbound Firestore sync engine |
| `Notify.logic.ts` | 1, 9 | Rename "Tank" → "Enclosure"; add FCM push alongside Discord |

### API Controllers (`api/controllers/`)

| File | Phase | Changes |
|------|-------|---------|
| `Tank.controller.ts` → `Enclosure.controller.ts` | 1 | Rename; update route parameters |
| `Maintenance.controller.ts` | 3 | Replace endpoints with generic `start`/`cancel`/`status` |
| `Animal.controller.ts` | 4 | Add `/food-types` endpoint |
| NEW: `EnclosureType.controller.ts` | 2 | `GET /enclosure-types` endpoint |

### API Root

| File | Phase | Changes |
|------|-------|---------|
| `index.ts` | 1, 2 | Rename mount points; update Bonjour name; add enclosure-type routes |
| `package.json` | 8 | Add `firebase-admin` dependency |
| `.env` | 8 | Add `FIREBASE_*`, `EXOPET_DEVICE_ID`, `CLOUD_SYNC_*` variables |
| NEW: `firebase-service-account.json` | 8 | Firebase Admin SDK credentials (`.gitignored`) |

### React UI (`ui/src/`)

| File | Phase | Changes |
|------|-------|---------|
| `App.tsx` | 1 | Update routes: `/tank/` → `/enclosure/` |
| `views/Home.tsx` | 1 | "TankHub" → "ExoPet"; "Aquariums" → "Enclosures" |
| `views/TankList.tsx` → `EnclosureList.tsx` | 1 | Rename; "Tanks" → "Enclosures" |
| `views/TankDetail.tsx` → `EnclosureDetail.tsx` | 1, 3, 7 | Rename; replace water controls with dynamic operations |
| `components/TankCard.tsx` → `EnclosureCard.tsx` | 1, 7 | Rename; add type indicator |
| `components/AppBar/Tank.tsx` → `Enclosure.tsx` | 1 | Rename references |
| `components/AppBar/TankTemp.tsx` → `EnvironmentBar.tsx` | 1, 6 | Rename; expand to multi-parameter |
| `components/SettingsDialog.tsx` → `EnclosureSettingsDialog.tsx` | 1, 7 | Rename; dynamic settings from schema |
| `components/FeedingDialog.tsx` | 4 | Remove hardcoded food types; load from API |
| `components/ConditionsDisplay.tsx` | 1 | "Water Conditions" → "Environment" |
| `components/WaterChangeScheduler.tsx` | 3 | Generalize to "Maintenance Scheduler" or remove |
| `components/ScheduleDisplay.tsx` | 3 | "Next Water Change" → "Next Maintenance" |
| `dal/Tank.dal.ts` → `Enclosure.dal.ts` | 1 | Rename functions; update API paths |
| `dal/Maintenance.dal.ts` | 3 | Replace water-specific sends with generic `START_OPERATION` |

### iOS App (`ios/ExoPet/ExoPet/`)

| File | Phase | Changes |
|------|-------|---------|
| `Models/Tank.swift` → `Enclosure.swift` | 1 | Rename struct |
| `Models/TankSettings.swift` → `EnclosureSettings.swift` | 1, 2 | Rename; add new setting fields |
| `Models/SystemEnums.swift` | 3, 4 | Replace water enums with generic; remove `FoodType` enum |
| NEW: `Models/EnclosureType.swift` | 2 | Type definitions, settings schema |
| NEW: `Models/Operation.swift` | 3 | Operation state model |
| `Services/APIService.swift` | 1, 2, 4 | Update paths; add enclosure-type and food-type endpoints |
| `Services/WebSocketService.swift` | 3, 6 | Generic operation requests; humidity/UV parameters |
| NEW: `Services/FirestoreService.swift` | 8 | Firestore read/write/observe for cloud mode |
| NEW: `Services/DataSourceManager.swift` | 8, 9 | Routes data requests to local API or Firestore based on connectivity |
| NEW: `Services/AuthService.swift` | 8 | Firebase Auth sign-in/sign-out, current user state |
| `ViewModels/TankListViewModel.swift` → `EnclosureListViewModel.swift` | 1 | Rename |
| `ViewModels/TankDetailViewModel.swift` → `EnclosureDetailViewModel.swift` | 1, 3 | Rename; generic operation state machine |
| `ViewModels/SettingsViewModel.swift` → `EnclosureSettingsViewModel.swift` | 1, 7 | Rename; dynamic settings from schema |
| `ViewModels/FeedingDialogViewModel.swift` | 4 | Load food types from API |
| `Views/TankListView.swift` → `EnclosureListView.swift` | 1 | Rename |
| `Views/TankDetailView.swift` → `EnclosureDetailView.swift` | 1, 3, 7 | Rename; dynamic controls |
| `Views/SettingsView.swift` → `EnclosureSettingsView.swift` | 1, 7 | Rename; dynamic form fields |
| `Views/HomeView.swift` | 1 | "Aquariums" → "Enclosures" |
| `Views/FeedingDialogView.swift` | 4 | Dynamic food type list |
| `Views/Components/TankCardView.swift` → `EnclosureCardView.swift` | 1, 7 | Rename; type indicator |
| `Views/Components/TemperatureBarView.swift` → `EnvironmentBarView.swift` | 6 | Multi-parameter display |
| `Views/Components/MaintenanceControlsView.swift` | 3, 7 | Dynamic operation buttons |
| `Views/Components/WaterLevelIndicatorView.swift` | 6 | Conditional: only show for types with water_level |
| `Theme/ExoPetTheme.swift` | 6 | Add humidity/UV color scales |
| `ContentView.swift` | 1, 8 | Update navigation for `Enclosure` type; add auth gate + device picker |
| `ExoPetApp.swift` | 8, 9 | Firebase init, FCM registration, AppDelegate for push notifications |
| NEW: `Views/SignInView.swift` | 8 | Firebase Auth sign-in screen |
| NEW: `Views/DevicePickerView.swift` | 8 | Select which Pi to connect to |
| NEW: `ViewModels/AuthViewModel.swift` | 8 | Sign-in/sign-out state management |
| NEW: `ViewModels/DevicePickerViewModel.swift` | 8 | Fetch owned devices from Firestore |

---

### Firebase Cloud Functions (`functions/src/`)

| File | Phase | Changes |
|------|-------|---------|
| NEW: `index.ts` | 9 | `checkDeviceHealth` scheduled function for offline detection |

### Firebase Configuration

| File | Phase | Changes |
|------|-------|---------|
| NEW: `firestore.rules` | 8 | Security rules for device-scoped, owner-authenticated access |
| NEW: `firestore.indexes.json` | 8 | Composite indexes for readings queries (enclosure_id + parameter + timestamp) |
| NEW: `.firebaserc` | 8 | Firebase project configuration |
| NEW: `firebase.json` | 8 | Firebase CLI config (hosting, functions, firestore) |

---

*This document should be treated as a living spec. Update it as implementation decisions are made, new enclosure types are added, and cloud features are rolled out.*
