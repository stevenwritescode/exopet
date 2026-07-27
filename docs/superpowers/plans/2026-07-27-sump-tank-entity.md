# Sump Tank Entity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Model a sump as a first-class Tank (`role: "sump"`, `parent_tank_id`) — manageable from iOS, displayed read-only on the kiosk.

**Architecture:** Additive columns on `tanks` via the existing `runMigrations()` pattern; new whitelisted `POST /tank/:tankId/update` endpoint carries connect/disconnect; `GET /tank/:tankId` gains a `sump` child object. iOS gets a Sump card on tank detail; kiosk nests sumps under their display tank.

**Tech Stack:** TypeScript (Express/SQLite API, shared models, CRA kiosk UI), Swift/SwiftUI (iOS).

## Global Constraints

- The API has no test framework — verification is `npx tsc --noEmit` (models/ui), models rebuild, curl checks against the live hub, and `xcodebuild` for iOS.
- Node 20 required for builds: `export PATH=/Users/unknower/.nvm/versions/node/v20.20.2/bin:$PATH`.
- Deploys: scp changed files to `exopet@exopet-api.local:~/exopet/...` (hub) and `exopet@exopet-ui.local:~/exopet/...` (kiosk) with `sshpass -p exopet`, then restart `exopet.service` / `exopet-kiosk.service` (`echo exopet | sudo -S systemctl restart <svc>`). Sync `models/lib` whenever models change.
- Allowed `tank` update columns exactly: `name`, `type`, `role`, `parent_tank_id`.
- Validation reasons (exact strings): `"a tank cannot be its own sump parent"`, `"parent tank not found"`, `"cannot attach a sump to another sump"`, `"sump is already connected to another tank"`.

---

### Task 1: Models — Tank gains role/parent_tank_id

**Files:**
- Modify: `models/src/Tank.model.ts`
- Modify: `ios/ExoPet/ExoPet/Models/Tank.swift`

**Interfaces:**
- Produces: `Tank.role?: "display" | "sump"`, `Tank.parent_tank_id?: string` (TS); `Tank.role: String?`, `Tank.parent_tank_id: String?` (Swift, decoded via `decodeIfPresent`).

- [ ] **Step 1:** In `models/src/Tank.model.ts`, add to the class fields:

```ts
  role?: "display" | "sump";
  parent_tank_id?: string;
```

Add `role, parent_tank_id` to the constructor's destructured params and assign both (`this.role = role; this.parent_tank_id = parent_tank_id;`).

- [ ] **Step 2:** Rebuild models: `cd models && npm run build`. Verify `grep parent_tank_id lib/Tank.model.d.ts` shows the field.
- [ ] **Step 3:** In `ios/ExoPet/ExoPet/Models/Tank.swift`, add `var role: String?` and `var parent_tank_id: String?` to the struct, its CodingKeys, its init(s), and the decoder (`decodeIfPresent(String.self, ...)` — use the file's existing string-or-int helper if ids decode through it).
- [ ] **Step 4:** `npx tsc --noEmit` in `models` passes. Commit: `"Add role and parent_tank_id to Tank model (TS + Swift)"`

---

### Task 2: API — migration, fixed insert, update endpoint, sump in detail

**Files:**
- Modify: `api/data/common.data.ts` (runMigrations)
- Modify: `api/data/Tank.data.ts`
- Modify: `api/controllers/Tank.controller.ts`

**Interfaces:**
- Consumes: Task 1's Tank fields.
- Produces: `TankDataManager.updateTank(tankId, fields)`, `TankDataManager.getSumpForTank(displayId): Promise<Tank|null>`; routes `POST /tank/:tankId/update`, `GET /tank/:tankId` response `{...tank, settings, sump: Tank|null}`.

- [ ] **Step 1:** In `runMigrations()` add a second loop over the `tanks` table (same duplicate-column-tolerant pattern):

```ts
  const tankColumns = [
    { name: "role", type: "TEXT DEFAULT 'display'" },
    { name: "parent_tank_id", type: "TEXT" },
  ];
  for (const col of tankColumns) {
    try {
      await conn.run(`ALTER TABLE tanks ADD COLUMN ${col.name} ${col.type}`);
      console.log(`Migration: added tanks column ${col.name}`);
    } catch (e: any) {
      if (!e.message?.includes("duplicate column")) {
        console.error(`Migration error for tanks.${col.name}:`, e);
      }
    }
  }
```

- [ ] **Step 2:** Fix `addTank` in `api/data/Tank.data.ts` — store the model's id (today it inserts a fresh `uuid()` and the client is told a different id) and the new columns:

```ts
  static addTank = async (tank: Tank): Promise<void> => {
    const { id, type, name, role, parent_tank_id } = tank;
    const conn = await dbConnection();
    if (!conn) return;
    await conn.run(
      "INSERT INTO tanks (id, name, type, role, parent_tank_id) VALUES (?, ?, ?, ?, ?)",
      id,
      name,
      type,
      role || "display",
      parent_tank_id ?? null
    );
    await conn.close();
  };
```

- [ ] **Step 3:** Add to `TankDataManager` (mirroring `AnimalDataManager.updateAnimal`):

```ts
  static updateTank = async (
    tankId: string,
    fields: Partial<Pick<Tank, "name" | "type" | "role" | "parent_tank_id">>
  ): Promise<void> => {
    const allowedColumns = new Set(["name", "type", "role", "parent_tank_id"]);
    const conn = await dbConnection();
    if (!conn) return;
    const entries = Object.entries(fields).filter(([k]) => allowedColumns.has(k));
    if (entries.length === 0) { await conn.close(); return; }
    const setClause = entries.map(([key]) => `${key} = ?`).join(", ");
    const values = entries.map(([, v]) => v ?? null);
    await conn.run(`UPDATE tanks SET ${setClause} WHERE id = ?`, ...values, tankId);
    await conn.close();
  };

  static getSumpForTank = async (displayId: string): Promise<Tank | null> => {
    const conn = await dbConnection();
    if (!conn) return null;
    const sump = await conn.get(
      "SELECT * FROM tanks WHERE parent_tank_id = ? AND role = 'sump'",
      displayId
    );
    await conn.close();
    return sump ?? null;
  };
```

- [ ] **Step 4:** In `Tank.controller.ts` add the update route with the spec's validations (exact reason strings from Global Constraints):

```ts
router.post("/:tankId/update", async (req, res) => {
  try {
    const tankId = req.params.tankId;
    const fields = req.body || {};
    if (fields.parent_tank_id) {
      if (fields.parent_tank_id === tankId) {
        return res.status(400).json({ error: "a tank cannot be its own sump parent" });
      }
      const parent = await TankDataManager.getTankData(fields.parent_tank_id);
      if (!parent) {
        return res.status(400).json({ error: "parent tank not found" });
      }
      if ((parent as any).role === "sump") {
        return res.status(400).json({ error: "cannot attach a sump to another sump" });
      }
      const current = await TankDataManager.getTankData(tankId);
      if (
        (current as any)?.role === "sump" &&
        (current as any)?.parent_tank_id &&
        (current as any).parent_tank_id !== fields.parent_tank_id
      ) {
        return res.status(409).json({ error: "sump is already connected to another tank" });
      }
    }
    await TankDataManager.updateTank(tankId, fields);
    const updated = await TankDataManager.getTankData(tankId);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 5:** In the existing `GET /:tankId` handler, attach the sump before responding: after fetching `tankData`, add `const sump = await TankDataManager.getSumpForTank(tankId);` and return `res.json({ ...tankData, sump });` (preserve the current settings merge — `tankData` already carries `settings`).
- [ ] **Step 6:** Deploy to hub (scp the three changed files + `models/src` + `models/lib`; restart `exopet.service`). Curl verification against `http://exopet-api.local:3001` (expect in order):
  1. `POST /tank/add` `{"tank":{"name":"Test Sump","type":"Freshwater","role":"sump"}}` → 200, response id **matches** a row in a follow-up `GET /tank/all` (id bug fixed)
  2. `POST /tank/<sumpId>/update` `{"parent_tank_id":"<sumpId>"}` → 400 self-parent
  3. `POST /tank/<sumpId>/update` `{"role":"sump","parent_tank_id":"<displayId>"}` → 200
  4. `GET /tank/<displayId>` → contains `"sump":{...\"Test Sump\"...}`
  5. Create a second sump, try to attach a sump to `<sumpId>` → 400 sump-of-sump
  6. `POST /tank/<sumpId>/update` `{"role":"display","parent_tank_id":null}` → 200; `GET /tank/<displayId>` shows `"sump":null`
  7. Clean up test tanks via direct sqlite delete on the Pi.
- [ ] **Step 7:** Commit: `"Add tank update endpoint, sump linking, and fix addTank id"`

---

### Task 3: Kiosk UI — nest sumps, show sump line on detail

**Files:**
- Modify: `ui/src/dal/Tank.dal.ts` (add `updateTank` only if needed by nothing — SKIP; kiosk is read-only)
- Modify: `ui/src/views/TankList.tsx`
- Modify: `ui/src/views/TankDetail.tsx`

**Interfaces:**
- Consumes: `Tank.role`, `Tank.parent_tank_id` (Task 1), `GET /tank/:id` → `.sump` (Task 2).

- [ ] **Step 1:** In `TankList.tsx`, where tanks are mapped into cards, filter the top level and look up sumps:

```tsx
const displayTanks = tanks.filter((t) => t.role !== "sump");
const sumpFor = (tankId?: string) =>
  tanks.find((t) => t.role === "sump" && t.parent_tank_id === tankId);
```

Render existing cards from `displayTanks`; inside each card, when `sumpFor(tank.id)` exists add:

```tsx
<Typography variant="caption" color="grey">
  Sump: {sumpFor(tank.id)?.name}
</Typography>
```

- [ ] **Step 2:** In `TankDetail.tsx`, the tank fetch already returns the detail object — surface `sump` from it in component state alongside existing fields. Under the Animals section add a read-only line rendered only when `sump` is non-null:

```tsx
<Item variant="button">Sump: {sump.name}</Item>
```

(Use the existing `Item` styled component; no controls.)

- [ ] **Step 3:** `npx tsc --noEmit` in `ui` passes. Deploy `ui/src` changes to kiosk Pi via scp; verify dev server recompiles clean (`journalctl -u exopet-kiosk.service | grep compiled`).
- [ ] **Step 4:** Commit: `"Show sump nested under display tank in kiosk UI"`

---

### Task 4: iOS — Sump card on tank detail, nested list

**Files:**
- Modify: `ios/ExoPet/ExoPet/Services/APIService.swift` (add `updateTank` + `addTank` helpers if absent)
- Modify: `ios/ExoPet/ExoPet/ViewModels/TankDetailViewModel.swift`
- Modify: `ios/ExoPet/ExoPet/Views/TankDetailView.swift`
- Modify: `ios/ExoPet/ExoPet/Views/TankListView.swift`

**Interfaces:**
- Consumes: Swift `Tank.role`/`parent_tank_id` (Task 1); API routes (Task 2).
- Produces: `APIService.updateTank(tankId: String, fields: [String: String?]) async throws -> Tank`, `APIService.addTank(_ tank: TankCreateRequest) async throws -> Tank`.

- [ ] **Step 1:** Read `APIService.swift`'s existing request helpers; add (following its request/decode conventions):
  - `addTank` POSTing `{"tank": {...}}` to `/tank/add`, decoding `Tank`
  - `updateTank` POSTing raw fields to `/tank/<id>/update`, decoding `Tank`
  Use a small `TankCreateRequest: Codable` (`name`, `type`, `role`, `parent_tank_id`) placed in `Tank.swift`.
- [ ] **Step 2:** In `TankDetailViewModel`, decode `sump` from the tank-detail response (add `var sump: Tank?` to the response-decoding path — check how the VM decodes `GET /tank/:id` and extend that type), and expose:
  - `func addSump(named: String)` → `addTank` with `role: "sump"`, `parent_tank_id: tankId`, `type` = parent's type, then refresh
  - `func connectSump(_ sump: Tank)` → `updateTank(sump.id, ["role": "sump", "parent_tank_id": tankId])`, refresh
  - `func disconnectSump()` → `updateTank(sump.id, ["role": "display", "parent_tank_id": nil])`, refresh
  - `var eligibleSumps: [Tank]` → from `/tank/all`: tanks where `role != "sump"` and `id != tankId` and no animals dependency needed (keep simple: role filter only)
- [ ] **Step 3:** In `TankDetailView.swift` add a Sump card following the view's existing card styling (`ExoPetColors.cardSurface`, caption-uppercase labels):
  - `vm.sump == nil`: buttons **Add Sump** (alert with TextField for name → `vm.addSump`) and **Connect Existing** (menu/sheet listing `vm.eligibleSumps` → `vm.connectSump`)
  - `vm.sump != nil`: sump name, and a **Disconnect** button (confirmation alert → `vm.disconnectSump()`)
- [ ] **Step 4:** In `TankListView.swift`, filter `role == "sump"` out of the main list; under each tank row whose sump exists, show a smaller indented row: sump name + "SUMP" caption badge, non-navigating (or navigate to the same detail view if trivial with existing NavigationLink value pattern).
- [ ] **Step 5:** Build: `cd ios/ExoPet && xcodebuild -project ExoPet.xcodeproj -scheme ExoPet -destination 'generic/platform=iOS Simulator' -quiet build` → exit 0.
- [ ] **Step 6:** Commit: `"Add sump management to iOS tank detail and nested list"`

---

### Task 5: Live verification + deploy sync

- [ ] **Step 1:** Kiosk models sync: scp `models/src/Tank.model.ts` + `models/lib` to `exopet-ui.local:~/exopet/models/`; confirm kiosk compiles.
- [ ] **Step 2:** On the hub, create the real sump: `POST /tank/add` `{"tank":{"name":"Axolotl Sump","type":"Freshwater","role":"sump","parent_tank_id":"de993126-d6b0-48e9-b1d4-0486cea71d05"}}` → 200.
- [ ] **Step 3:** `GET /tank/de993126-.../` shows `"sump"`; kiosk tank list shows "Sump: Axolotl Sump" under Axolotl Tank (verify via headless probe of `http://192.168.5.64:3000/tanks` — expect the text in body).
- [ ] **Step 4:** Report iOS needs a rebuild in Xcode for the Sump card to appear.
- [ ] **Step 5:** Final commit + push of any remaining changes.
