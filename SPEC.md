# ExoPet / TankHub — Application Specification

> **Purpose:** This document fully specifies the ExoPet aquarium management application so that another agent can build a native iOS app with identical functionality. It covers every screen, interaction, data model, API endpoint, and real-time protocol.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Models](#2-data-models)
3. [API Endpoints (REST)](#3-api-endpoints-rest)
4. [WebSocket Protocol](#4-websocket-protocol)
5. [Screens & Navigation](#5-screens--navigation)
6. [Screen Specifications](#6-screen-specifications)
7. [Shared UI Patterns](#7-shared-ui-patterns)
8. [Business Logic & Rules](#8-business-logic--rules)
9. [Appendix: Enum Definitions](#9-appendix-enum-definitions)

---

## 1. Architecture Overview

The system consists of:

- **API server** — Express.js on a Raspberry Pi. Manages a SQLite database, controls hardware (GPIO relays, temperature sensors, float switch) and exposes both REST endpoints and a WebSocket server on port `3001`.
- **UI client** — React 18 + Electron app on a second Raspberry Pi touchscreen (kiosk mode). Communicates with the API via HTTP (Axios) and a persistent WebSocket connection.
- **Shared models** — An `aquario-models` npm package defining `Animal`, `Tank`, `TankSettings`, `Log`, `Maintenance`, and `System` types/enums used by both API and UI.

### API Base URL

```
http://<API_HOST>:3001
```

### WebSocket URL

```
ws://<API_HOST>:3001
```

---

## 2. Data Models

### 2.1 Animal

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` (UUID) | Yes | Auto-generated |
| `tank_id` | `string` | No | Legacy field |
| `enclosure_id` | `string` | No | Current tank assignment (used for queries) |
| `enclosure_type` | `string` | No | |
| `name` | `string` | No | Display name |
| `species` | `string` | No | Common name |
| `species_latin` | `string` | No | Scientific name |
| `notes` | `string` | No | Free-text notes |
| `last_feeding_log` | `object` | No | Embedded in model, not always populated from API |
| `last_feeding_log.log_type` | `string` | | |
| `last_feeding_log.timestamp` | `string` (ISO 8601) | | |
| `last_feeding_log.food_type` | `string` | | |
| `last_feeding_log.food_quantity` | `number` | | |
| `last_feeding_log.log_json` | `string` | | |

### 2.2 Tank

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` (UUID) | Yes | Auto-generated |
| `name` | `string` | No | Display name |
| `type` | `string` | No | Tank type label |
| `service_status` | `System.State` (integer enum) | Yes | Default: `0` (IDLE) |
| `settings` | `TankSettings` | Yes | Nested object |

### 2.3 TankSettings

| Field | Type | Required | Notes |
|---|---|---|---|
| `tank_id` | `string` | No | Foreign key to Tank |
| `volume` | `number` | No | Tank volume |
| `vol_unit` | `string` | No | e.g., `"gallons"` |
| `drain_time` | `number` | No | Drain duration in seconds |
| `fill_time` | `number` | No | Fill duration in seconds |
| `res_fill_time` | `number` | No | Reservoir fill duration in seconds |
| `has_reservoir` | `boolean` | No | Whether the tank has a reservoir |
| `lower_temp_limit` | `number` | No | Lower temperature alert threshold (°C) |
| `upper_temp_limit` | `number` | No | Upper temperature alert threshold (°C) |

### 2.4 Log

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` (UUID) | Yes | Auto-generated |
| `action_type` | `string` | Yes | e.g., `"Feeding"`, `"Water Change"` |
| `animal_id` | `string \| number` | No | |
| `container_id` | `string \| number` | No | Tank ID |
| `timestamp` | `string` (ISO 8601) | Yes | Auto-set on creation. Stored as UTC SQL format. |
| `log_json` | `any` | No | Arbitrary JSON. For feeding logs: `{ food_type: string, quantity: number }`. Stored as JSON string in DB, parsed to object when returned for animal detail. |

---

## 3. API Endpoints (REST)

### 3.1 Health Check

| Method | Path | Response |
|---|---|---|
| `GET` | `/_health/` | `{ success: true, text: "Server is up and running." }` |

### 3.2 Tank Endpoints

| Method | Path | Request Body | Response | Description |
|---|---|---|---|---|
| `GET` | `/tank/all` | — | `Tank[]` | List all tanks |
| `POST` | `/tank/add` | `{ tank: Partial<Tank> }` | `Tank` | Create a new tank |
| `GET` | `/tank/:tankId` | — | `Tank` (with nested `settings`) | Get single tank with settings |
| `GET` | `/tank/:tankId/animals` | — | `Animal[]` | Get all animals in a tank |
| `GET` | `/tank/:tankId/logs` | — | `Log[]` | Get all logs for a tank |
| `GET` | `/tank/:tankId/temperature` | — | `{ temperatures: number[], average: number }` | Read live temperature sensors |
| `GET` | `/tank/:tankId/settings` | — | `TankSettings` | Get tank settings |
| `POST` | `/tank/:tankId/settings` | `{ settings: TankSettings }` | `TankSettings` | Update tank settings (server strips `id` and `tank_id` from body) |

### 3.3 Animal Endpoints

| Method | Path | Request Body | Response | Description |
|---|---|---|---|---|
| `GET` | `/animal/all` | — | `Animal[]` | List all animals |
| `POST` | `/animal/add` | `{ animal: Partial<Animal> }` | `Animal` | Create a new animal |
| `GET` | `/animal/:animalId` | — | `{ animal: Animal, logs: Log[] }` | Get animal with feeding logs (logs have `log_json` parsed from JSON string to object). Logs sorted newest-first. |
| `POST` | `/animal/:animalId/update` | `{ name?, species?, species_latin?, notes? }` | `Animal` | Update animal fields. Body is flat (not nested). |

### 3.4 Log Endpoints

| Method | Path | Request Body | Response | Description |
|---|---|---|---|---|
| `POST` | `/log/feeding` | `{ animal_id, action_type, container_id, log_json }` | `Log` | Create a feeding log |
| `DELETE` | `/log/feeding/:id` | — | `{ success: true }` | Delete a log entry |

### 3.5 Maintenance Endpoints (HTTP)

These are legacy HTTP endpoints. The primary interface for maintenance operations is WebSocket (see Section 4). Both trigger the same logic.

| Method | Path | Response | Description |
|---|---|---|---|
| `GET` | `/maintenance/change/:tankId` | `{ message: "Water change complete." }` | Trigger full water change |
| `GET` | `/maintenance/fill/:tankId` | `{ duration, durationMs, message }` | Start filling tank |
| `GET` | `/maintenance/drain/:tankId` | `{ duration, durationMs, message }` | Start draining tank |
| `GET` | `/maintenance/reset/:tankId` | `{ message: "Service status was reset." }` | Stop all operations, reset state |

---

## 4. WebSocket Protocol

### 4.1 Connection

Connect to `ws://<API_HOST>:3001`. On connect, the server sends:

```json
{ "message": "Hello Client!" }
```

### 4.2 Keep-Alive

The client sends a ping every 30 seconds:

```json
{ "action": "ping" }
```

The server silently ignores this message.

### 4.3 Reconnection

On disconnect, the client waits 2 seconds then reconnects automatically. Messages sent while disconnected are queued and flushed on reconnect.

### 4.4 Client → Server Messages

All messages: `{ "action": "<action>", "data": { "tank_id": "<id>" } }`

| Action | Description |
|---|---|
| `"temperature"` | Request current temperature reading |
| `"water_level"` | Request current float switch / water level state |
| `"start_water_change"` | Start full water change cycle (drain → fill → optional reservoir fill) |
| `"start_fill_tank"` | Start fill-only operation |
| `"start_drain_tank"` | Start drain-only operation |
| `"cancel_water_change"` | Cancel any active operation |
| `"cancel_fill_tank"` | Cancel any active operation |
| `"cancel_drain_tank"` | Cancel any active operation |
| `"reset_state"` | Reset service state to idle |
| `"start_fill_reservoir"` | Start reservoir fill (data uses `res_id` instead of `tank_id`) |
| `"ping"` | Keep-alive (no response) |

### 4.5 Server → Client Messages

Broadcast to all connected clients: `{ "action": "<action>", "data": { ... } }`

| Action | Payload | When Sent |
|---|---|---|
| `"temperature"` | `{ temperatures: number[], average: number }` | Response to temperature request |
| `"water_level"` | `{ tank_id?: string, waterFull: boolean }` | Response to water level request, or when float switch state changes |
| `"state_reset"` | `{ tank_id: string }` | After a cancel request is processed |
| `"water_change_began"` | `{ tank_id: string }` | Water change cycle started |
| `"water_change_complete"` | `{ tank_id: string }` | Entire water change cycle finished |
| `"water_drain_began"` | `{ tank_id: string, duration: number, durationMs: number }` | Drain relay activated |
| `"water_drain_complete"` | `{ tank_id: string, changing: boolean }` | Drain timer finished |
| `"water_fill_began"` | `{ tank_id: string, duration: number, durationMs: number }` | Fill relay activated |
| `"water_fill_complete"` | `{ tank_id: string, changing: boolean }` | Fill timer finished or float switch triggered |
| `"fill_reservoir_began"` | `{ res_id: string, duration: number, durationMs: number }` | Reservoir fill relay activated |
| `"fill_reservoir_complete"` | `{ res_id: string, changing: boolean }` | Reservoir fill timer finished |

---

## 5. Screens & Navigation

```
Home (/)
├── Aquariums → TankList (/tanks)
│   ├── [Home icon] → Home
│   └── [Manage] → TankDetail (/tank/:tank_id)
│       ├── [Back "Tanks"] → TankList
│       ├── [Animal button] → AnimalDetail (/animal/:animal_id)
│       └── [Settings gear] → SettingsDialog (fullscreen overlay)
│
└── Animals → AnimalList (/animals)
    ├── [Home icon] → Home
    ├── [Feed] → FeedingDialog (inline overlay)
    └── [Manage] → AnimalDetail (/animal/:animal_id)
        ├── [Back "Animals"] → AnimalList
        ├── [Tank Maintenance card] → TankDetail (/tank/:enclosure_id)
        ├── [View Feeding Logs card] → FeedingLogs (fullscreen overlay)
        ├── [Feed button] → FeedingDialog (fullscreen overlay)
        └── [Edit icon] → AnimalEditDialog (fullscreen overlay)
```

---

## 6. Screen Specifications

### 6.1 Home Screen (`/`)

**Layout:** Full-height centered column.

**Elements:**
1. **Title:** "TankHub" (large heading, top 25% of screen).
2. **Two navigation cards** in a horizontal row (middle 50%):
   - **"Aquariums"** — navigates to `/tanks`
   - **"Animals"** — navigates to `/animals`

**Data:** None required.

---

### 6.2 Tank List Screen (`/tanks`)

**Layout:** App bar + scrollable card list.

**App Bar:** Home icon (left) → navigates to `/`. Live clock (right).

**Elements:**
1. **Title:** "Tanks" (centered heading).
2. **Tank cards:** One per tank, each showing:
   - Tank name
   - Tank type
   - "Manage" button → navigates to `/tank/:tank_id`

**Data on load:** `GET /tank/all` → `Tank[]`

---

### 6.3 Tank Detail Screen (`/tank/:tank_id`)

This is the most complex screen. It provides real-time monitoring and maintenance controls.

**App Bar:** Back button "Tanks" (left, → `/tanks`). Tank name (center). Live clock (right).

**Data on load:**
- `GET /tank/:tank_id` → Tank (with settings, service_status)
- `GET /tank/:tank_id/animals` → Animal[]
- `GET /tank/:tank_id/logs` → Log[]
- WebSocket: subscribe to messages

**Elements (top to bottom):**

#### WebSocket Connection Indicator
- Green check + "Connected" when WebSocket is open
- Red X + "Disconnected" when WebSocket is closed

#### Animals Section
- Label: "Animals"
- Horizontal row of animal buttons (avatar + name per animal)
- Each button navigates to `/animal/:animal_id`
- If no animals: "No animals in this tank"

#### Maintenance Controls Section
- Label: "Maintenance" with a settings gear icon that opens the Settings Dialog

**Three action buttons:**

| Button | Enabled When | Active Visual | Action Sent |
|---|---|---|---|
| **Change Water** | `service_status == IDLE` | Purple circular progress showing `waterChangeProgress` (0–100%) | `start_water_change` |
| **Fill Tank** | `service_status == IDLE` | Circular progress showing `fillProgress` (0–100%) | `start_fill_tank` |
| **Drain Tank** | `service_status == IDLE` | Circular progress showing `drainProgress` (100–0%) | `start_drain_tank` |

**Cancel button:** Only visible when `service_status > IDLE`. Sends `cancel_water_change`. Shows "Cancelling..." spinner while waiting for `state_reset`.

#### Progress Simulation (client-side)

The client simulates progress bars locally using 500ms timers based on the configured `drain_time` and `fill_time` from tank settings:

- **Drain:** Starts at 100%, decrements by `(100 / drain_time_seconds) / 2` every 500ms
- **Fill:** Starts at 0%, increments by `(100 / fill_time_seconds) / 2` every 500ms
- **Water change:** Overall progress calculated from drain + fill phases

Progress resets when a `state_reset` or completion message is received.

#### Temperature Bar (bottom-fixed)
- Fixed to bottom of screen
- Displays current temperature in °C and °F
- Color-coded by danger level (see Section 8.3)
- Tappable to manually refresh
- Auto-polls temperature via WebSocket every 5 seconds

#### Water Level Indicator
- Displays "Full" (green check) or "Not Full" (blue water drop)
- Auto-polls via WebSocket every 5 seconds
- Tappable to manually check

**WebSocket messages sent from this screen:**

| Trigger | Action |
|---|---|
| Mount + every 5s | `water_level` check |
| Temperature bar mount + every 5s | `temperature` check |
| "Change Water" button | `start_water_change` |
| "Fill Tank" button | `start_fill_tank` |
| "Drain Tank" button | `start_drain_tank` |
| "Cancel Job" button | `cancel_water_change` |

**WebSocket messages handled:**

| Action Received | Effect |
|---|---|
| `temperature` | Update temperature display |
| `water_level` | Update water level indicator |
| `water_change_began` | Set water change in progress, progress = 0% |
| `water_drain_began` | Set state to DRAINING (or WATER_CHANGE_DRAINING), drain progress = 100% |
| `water_drain_complete` | Set state to IDLE |
| `water_fill_began` | Set state to FILLING_TANK (or WATER_CHANGE_FILLING_TANK), fill progress = 0% |
| `water_fill_complete` | Set state to IDLE |
| `water_change_complete` | Set state to IDLE, water change progress = 100% |
| `state_reset` | Set state to IDLE, cancel spinner off |

---

### 6.4 Settings Dialog (fullscreen overlay, from Tank Detail)

**App Bar:** Close button (left). "Tank Settings" title (center). Save button (right).

**Fields:**

| Setting | Control | Range | Display Format |
|---|---|---|---|
| Drain Duration | Slider | 0–1200 seconds, step 5 | `"{m}m {s}s"` (e.g., "5m 30s") |
| Fill Duration | Slider | 0–1200 seconds, step 5 | `"{m}m {s}s"` |
| Reservoir Mode | Toggle switch | on/off | Boolean |

**On save:** `POST /tank/:tankId/settings` with `{ settings: { drain_time, fill_time, has_reservoir } }`

---

### 6.5 Animal List Screen (`/animals`)

**Layout:** App bar + scrollable card list.

**App Bar:** Home icon → `/`. Live clock.

**Elements:**
1. **Title:** "Animals" (centered heading).
2. **Animal cards:** One per animal, each showing:
   - Animal name
   - Species
   - "Manage" button → navigates to `/animal/:animal_id`
   - "Feed" button (green) → opens FeedingDialog inline

**Data on load:** `GET /animal/all` → `Animal[]`

**Inline feeding:** When "Feed" is tapped on any card, a FeedingDialog overlay opens. On save, it sends `POST /log/feeding` with `{ animal_id, action_type: "Feeding", container_id: animal.enclosure_id, log_json }`.

---

### 6.6 Animal Detail Screen (`/animal/:animal_id`)

**App Bar:** Back button "Animals" (left, → `/animals`). Animal name (center). Live clock (right).

**Data on load:**
- `GET /animal/:animal_id` → `{ animal: Animal, logs: Log[] }`
- If animal has `enclosure_id`: `GET /tank/:enclosure_id` → Tank (for temperature bar)
- WebSocket: subscribe to temperature updates

**Layout:** Two-column horizontal layout.

#### Left Column (animal info)
1. **Animal name** (large text) with an **edit icon button** (pencil) → opens AnimalEditDialog
2. **Avatar** — static image, 128×128px
3. **Species** — grey text
4. **Species (Latin)** — grey italic text
5. **Notes** — centered text

#### Right Column (actions)
1. **"Tank Maintenance" card** — navigates to `/tank/:enclosure_id`
2. **"View Feeding Logs" card** — opens FeedingLogs overlay
3. **Feed button** — three visual states based on time since last feeding:

| Condition | Visual | Behavior |
|---|---|---|
| **Urgent** (≥ 72h since last feed) | Green card with pulsing glow animation, "FEED!" label, burger icon | Tappable → opens FeedingDialog |
| **Ready** (≥ 48h, < 72h) | Green card, "FEED!" label | Tappable → opens FeedingDialog |
| **Recently fed** (< 48h) | Grey card, 60% opacity, "FED" label | Not tappable |

4. **Feeding status text** — color-coded:
   - `#faa` (pink-red) if urgent: "Needs to be fed ASAP!"
   - `#afa` (light green) if ready: "Ready for feeding."
   - `#999` (grey) if recently fed: "Recently fed."
   - If no feeding log exists: "{name} has not been fed yet."
   - If a feeding log exists with `log_json`: appends "Ate {quantity} {food_type}(s) at {formatted_datetime}"
   - Tapping this text always opens FeedingDialog regardless of state

#### Temperature Bar (bottom-fixed)
Same as Tank Detail — only shown if animal has an associated tank. Polls temperature every 5 seconds via WebSocket.

---

### 6.7 Feeding Dialog (fullscreen overlay)

**App Bar:** Close button (left). "Log Feeding" title (center). Live clock (right).

**Two-step flow:**

#### Step 1: Selection (shown while either selection is incomplete)

**Food Type** — 3 selectable cards in a horizontal row:
- "Pellet"
- "Bloodworm"
- "Earthworm"

Visual: Selected card has light blue background + dark blue text + dark blue border. Unselected cards are grey with white text.

**Quantity** — 4 selectable cards in a horizontal row:
- "1"
- "2"
- "3"
- "4+"

Same selected/unselected visual pattern.

#### Step 2: Confirmation (shown when both selections made)

- Heading: "Add this log?"
- Description: "Fed {quantity} {food_type}(s) to {animal_name}." (If quantity is 4+, adds "or more" before food type.)
- "Add Log" button (contained, large)
- "Cancel" button (outlined, small)

**On save:** Creates JSON:
```json
{ "food_type": "<selected_type>", "quantity": <selected_number> }
```
Sends `POST /log/feeding` with `{ animal_id, action_type: "Feeding", container_id, log_json }`.

After saving, re-fetches animal data to update the feeding status.

---

### 6.8 Feeding Logs Dialog (fullscreen overlay)

**App Bar:** Close button (left). "Feeding Logs" title (center). Live clock (right).

**Elements:**
1. **Animal name** (centered heading)
2. **Scrollable log list** (275px height):

Each log card shows:
- **Delete button** — positioned top-right corner. Shows a confirmation prompt ("Are you sure you want to delete this feeding log?") before deleting via `DELETE /log/feeding/:id`.
- **Action type** — bold centered label (e.g., "Feeding")
- **Two-column detail row:**
  - Left: "Date:" + formatted date, "Time:" + formatted time
  - Right: "Food Type:" + `log_json.food_type` (or "N/A"), "Quantity:" + `log_json.quantity` (or "N/A")

**Date/time formatting:** Timestamps are stored in UTC SQL format. Display in local time using:
- Date: medium format with weekday (e.g., "Mon, Jan 5, 2026")
- Time: with seconds (e.g., "2:30:45 PM")

After deletion, the parent re-fetches animal data.

---

### 6.9 Animal Edit Dialog (fullscreen overlay)

**App Bar:** Close button (left). "Edit Animal" title (center). Save button (right).

**Fields:**

| Field | Control | Notes |
|---|---|---|
| Name | Text input | |
| Species | Text input | |
| Species (Latin) | Text input | |
| Notes | Multiline text input (3 rows) | |

All fields pre-populated from current animal data.

**On save:** `POST /animal/:animalId/update` with `{ name, species, species_latin, notes }`. Then re-fetches animal data.

---

## 7. Shared UI Patterns

### 7.1 Theme
- Dark mode with pure black background (`#000000`)
- Paper/card surfaces: dark grey (`#424242`)
- Card backgrounds in lists: `#252525`

### 7.2 App Bar Pattern
Every screen has a top app bar with:
- Left: Navigation (home icon or back arrow with label)
- Center: Screen/entity title
- Right: Live clock (updates every second)
- Background: black

### 7.3 Fullscreen Dialog Pattern
Settings, feeding, logs, and edit dialogs all use the same fullscreen overlay pattern:
- App bar with close (X) button, title, and optional save/clock
- Content below the app bar
- Opening/closing is managed by boolean state in the parent

### 7.4 Temperature Display
Used in both Tank Detail and Animal Detail (bottom-fixed bar):
- Shows temperature in both °C and °F
- Color-coded by danger level (see Section 8.3)
- Shows warning icon when temperature is out of configured range
- Shows danger level label text
- Default temp limits when not configured: lower = 25°C, upper = 30°C
- Tappable to manually refresh
- Auto-refreshes every 5 seconds via WebSocket

---

## 8. Business Logic & Rules

### 8.1 Feeding Time Rules

| Condition | Hours Since Last Feed | Feed Button State | Status Text Color |
|---|---|---|---|
| Recently fed | < 48h | Greyed out, disabled | `#999` (grey) |
| Ready to feed | ≥ 48h, < 72h | Green, enabled | `#afa` (light green) |
| Urgent | ≥ 72h | Green with pulsing glow, enabled | `#faa` (pink-red) |
| Never fed | N/A (no log) | Green with pulsing glow, enabled | `#faa` (pink-red) |

Feeding time is calculated by parsing the most recent log's `timestamp` from UTC SQL format, converting to local time, then computing the difference in hours from now.

### 8.2 Water Change Cycle

A full water change proceeds through these phases:
1. **Drain** — Activates drain relay for `drain_time` seconds
2. **Fill** — Activates fill relay for `fill_time` seconds (or until float switch triggers "full")
3. **Reservoir Fill** (optional, if `has_reservoir` is true) — Activates reservoir relay for `res_fill_time` seconds

Each phase broadcasts "began" and "complete" WebSocket messages. The client tracks the overall state and simulates progress bars locally.

### 8.3 Temperature Danger Levels

| Condition | Level | Display Color |
|---|---|---|
| `temp < lower_limit - 5` | Dangerously cold | Indigo |
| `temp < lower_limit - 2.5` | Very cold | Blue |
| `temp < lower_limit` | Cold | Cyan |
| `lower_limit ≤ temp ≤ upper_limit` | Ideal | Lime/Green |
| `temp > upper_limit` | Warm | Yellow |
| `temp > upper_limit + 1.5` | Very warm | Orange |
| `temp > upper_limit + 3` | Dangerously warm | Red |

Temperature conversion: `°F = °C × 1.8 + 32` (both values displayed, rounded to nearest integer).

### 8.4 Service State Machine

The tank service status progresses through these states:

| State | Value | Meaning |
|---|---|---|
| `IDLE` | 0 | No operation in progress |
| `DRAINING` | 1 | Standalone drain |
| `FILLING_TANK` | 2 | Standalone fill |
| `FILLING_RESERVOIR` | 3 | Standalone reservoir fill |
| `WATER_CHANGE_DRAINING` | 4 | Drain phase of water change |
| `WATER_CHANGE_FILLING_TANK` | 5 | Fill phase of water change |
| `WATER_CHANGE_FILLING_RESERVOIR` | 6 | Reservoir phase of water change |

Buttons are disabled when state > IDLE. Cancel is only visible when state > IDLE.

### 8.5 Discord Notifications

The API sends Discord webhook alerts when temperature readings fall outside the configured limits. Alerts have a 15-minute cooldown per alert type per tank to prevent spam.

---

## 9. Appendix: Enum Definitions

### System.State
```
IDLE = 0
DRAINING = 1
FILLING_TANK = 2
FILLING_RESERVOIR = 3
WATER_CHANGE_DRAINING = 4
WATER_CHANGE_FILLING_TANK = 5
WATER_CHANGE_FILLING_RESERVOIR = 6
```

### System.ParameterCheck / System.ParameterUpdate
```
TEMPERATURE = "temperature"
PH = "ph"
OXYGEN = "oxygen"
WATER_LEVEL = "water_level"
```

### System.ServiceRequest
```
RESET_STATE = "reset_state"
START_WATER_CHANGE = "start_water_change"
START_FILL_TANK = "start_fill_tank"
START_FILL_RESERVOIR = "start_fill_reservoir"
START_DRAIN_TANK = "start_drain_tank"
CANCEL_WATER_CHANGE = "cancel_water_change"
CANCEL_FILL_TANK = "cancel_fill_tank"
CANCEL_FILL_RESERVOIR = "cancel_fill_reservoir"
CANCEL_DRAIN_TANK = "cancel_drain_tank"
```

### System.ServiceUpdate
```
STATE_RESET = "state_reset"
WATER_CHANGE_BEGAN = "water_change_began"
WATER_CHANGE_COMPLETE = "water_change_complete"
DRAIN_BEGAN = "water_drain_began"
DRAIN_COMPLETE = "water_drain_complete"
FILL_BEGAN = "water_fill_began"
FILL_COMPLETE = "water_fill_complete"
FILL_RESERVOIR_BEGAN = "fill_reservoir_began"
FILL_RESERVOIR_COMPLETE = "fill_reservoir_complete"
```

### Food Types (Feeding Dialog)
```
Pellet
Bloodworm
Earthworm
```

### Food Quantities (Feeding Dialog)
```
1, 2, 3, 4+
```
