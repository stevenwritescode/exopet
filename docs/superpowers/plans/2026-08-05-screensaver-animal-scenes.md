# Screensaver Animal Scenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The kiosk screensaver alternates between the existing video loop and rotating full-screen animal cards (name, species, notes, last-fed, Wikipedia photo + summary), keeps the temperature overlay across scenes, and surfaces a sump-lockout banner that breaks through.

**Architecture:** `Screensaver.tsx` gains a two-scene cycle (`video` ⇄ `cards`) driven by timers; a new `AnimalCardScene` component renders one animal at a time on a 25s cadence; a new `Species.dal.ts` fetches Wikipedia summaries once per species with a 30-day `localStorage` cache and silent offline fallback. Alerts: `TempStatusOverlay` stays mounted across scenes; a WS listener shows a red banner while the sump is `LOCKED_OUT`.

**Tech Stack:** React 18 + MUI + axios + luxon (all already in `ui/`), jest via react-scripts (existing `__mocks__/axios.ts` and fake-timer test conventions in `Screensaver.test.tsx`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-08-kiosk-screensaver-design.md`, amended by the user's 2026-08-03 decision: **alternate** video and animal cards (the video stays; cards do not replace it). Idle detection, tap-to-wake, home-navigation, and `xset` display-keepalive already exist — do not rebuild them.
- Run after the sump control plan (`2026-08-05-sump-pump-valve-control.md`): the lockout banner uses `System.ServiceUpdate.SUMP_STATE` / `System.SumpState.LOCKED_OUT` from the updated models.
- Scene timing constants exactly: `VIDEO_SCENE_MS = 90_000`, `CARD_MS = 25_000`. Card scene duration = `animals.length * CARD_MS`, then back to video. No animals → video only.
- Wikipedia endpoint exactly: `https://en.wikipedia.org/api/rest_v1/page/summary/<encodeURIComponent(query)>`, queried with `species_latin || species`. Cache key `species_wiki_cache_v1`, TTL 30 days. Lookup failure → render DB-only card, never an error state.
- Node 20 for builds: `export PATH=/Users/unknower/.nvm/versions/node/v20.20.2/bin:$PATH`. Tests: `cd ui && CI=true npx react-scripts test --watchAll=false`.
- Deploys: scp to `exopet@exopet-ui.local:~/exopet/ui/...` with `sshpass -p exopet`, restart `exopet-kiosk.service`.

---

### Task 1: Species DAL — Wikipedia summary with 30-day cache

**Files:**
- Create: `ui/src/dal/Species.dal.ts`
- Test: `ui/src/dal/Species.dal.test.ts`

**Interfaces:**
- Produces: `interface SpeciesInfo { title: string; extract: string; image?: string }` and `getSpeciesInfo(query?: string): Promise<SpeciesInfo | null>` — cached, null on miss/offline/empty query.

- [ ] **Step 1: Write the failing test** — `ui/src/dal/Species.dal.test.ts`:

```ts
import axios from "axios";
import { getSpeciesInfo } from "./Species.dal";

jest.mock("axios");
const mockedGet = axios.get as jest.Mock;

const WIKI_RESPONSE = {
  data: {
    title: "Axolotl",
    extract: "The axolotl is a paedomorphic salamander.",
    thumbnail: { source: "https://upload.wikimedia.org/axolotl.jpg" },
  },
};

describe("getSpeciesInfo", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedGet.mockReset();
  });

  it("returns null for an empty query without calling the network", async () => {
    expect(await getSpeciesInfo(undefined)).toBeNull();
    expect(await getSpeciesInfo("")).toBeNull();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("fetches the Wikipedia summary and maps title/extract/image", async () => {
    mockedGet.mockResolvedValueOnce(WIKI_RESPONSE);
    const info = await getSpeciesInfo("Ambystoma mexicanum");
    expect(mockedGet).toHaveBeenCalledWith(
      "https://en.wikipedia.org/api/rest_v1/page/summary/Ambystoma%20mexicanum"
    );
    expect(info).toMatchObject({
      title: "Axolotl",
      extract: "The axolotl is a paedomorphic salamander.",
      image: "https://upload.wikimedia.org/axolotl.jpg",
    });
  });

  it("serves the second lookup from cache (case-insensitive key)", async () => {
    mockedGet.mockResolvedValueOnce(WIKI_RESPONSE);
    await getSpeciesInfo("Ambystoma mexicanum");
    const info = await getSpeciesInfo("ambystoma MEXICANUM");
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(info?.title).toBe("Axolotl");
  });

  it("refetches after the 30-day TTL expires", async () => {
    mockedGet.mockResolvedValue(WIKI_RESPONSE);
    const realNow = Date.now;
    Date.now = jest.fn(() => 1_000_000);
    await getSpeciesInfo("Axolotl");
    Date.now = jest.fn(() => 1_000_000 + 31 * 24 * 60 * 60 * 1000);
    await getSpeciesInfo("Axolotl");
    Date.now = realNow;
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("returns null on network failure with an empty cache", async () => {
    mockedGet.mockRejectedValueOnce(new Error("offline"));
    expect(await getSpeciesInfo("Axolotl")).toBeNull();
  });

  it("falls back to a stale cache entry when the refetch fails", async () => {
    mockedGet.mockResolvedValueOnce(WIKI_RESPONSE);
    const realNow = Date.now;
    Date.now = jest.fn(() => 1_000_000);
    await getSpeciesInfo("Axolotl");
    Date.now = jest.fn(() => 1_000_000 + 31 * 24 * 60 * 60 * 1000);
    mockedGet.mockRejectedValueOnce(new Error("offline"));
    const info = await getSpeciesInfo("Axolotl");
    Date.now = realNow;
    expect(info?.title).toBe("Axolotl");
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `cd ui && CI=true npx react-scripts test --watchAll=false Species.dal` → FAIL (module not found).
- [ ] **Step 3: Implement** — `ui/src/dal/Species.dal.ts`:

```ts
import axios from "axios";

export interface SpeciesInfo {
  title: string;
  extract: string;
  image?: string;
}

interface CacheEntry extends SpeciesInfo {
  fetchedAt: number;
}

const CACHE_KEY = "species_wiki_cache_v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function readCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Wikipedia summary for a species, cached for 30 days.
 * Returns null when the query is empty or the lookup fails with no
 * cached fallback — callers render a DB-only card, never an error.
 */
export async function getSpeciesInfo(
  query?: string
): Promise<SpeciesInfo | null> {
  const trimmed = query?.trim();
  if (!trimmed) return null;

  const key = trimmed.toLowerCase();
  const cache = readCache();
  const hit = cache[key];
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) return hit;

  try {
    const resp = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        trimmed
      )}`
    );
    const entry: CacheEntry = {
      title: resp.data.title,
      extract: resp.data.extract,
      image: resp.data.thumbnail?.source ?? resp.data.originalimage?.source,
      fetchedAt: Date.now(),
    };
    cache[key] = entry;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // storage full/unavailable — cache is best-effort
    }
    return entry;
  } catch {
    return hit ?? null; // stale beats nothing; null beats an error card
  }
}
```

- [ ] **Step 4: Run tests to verify they pass** — same command → 6 passing.
- [ ] **Step 5: Commit** — `"Add Wikipedia species summary DAL with 30-day cache"`

---

### Task 2: AnimalCardScene component

**Files:**
- Create: `ui/src/components/AnimalCardScene.tsx`
- Test: `ui/src/components/AnimalCardScene.test.tsx`

**Interfaces:**
- Consumes: `getSpeciesInfo` (Task 1), `Animal` from `aquario-models`, `animalImageSrc` from `./AnimalCard`, luxon `DateTime`.
- Produces: `<AnimalCardScene animals={Animal[]} cardMs={number} />` — full-screen card for one animal at a time, advancing every `cardMs`, crossfading via keyed remount.

- [ ] **Step 1: Write the failing test** — `ui/src/components/AnimalCardScene.test.tsx`:

```tsx
import { render, screen, act } from "@testing-library/react";
import AnimalCardScene from "./AnimalCardScene";

jest.mock("../dal/Species.dal", () => ({
  getSpeciesInfo: jest.fn().mockResolvedValue({
    title: "Axolotl",
    extract: "A paedomorphic salamander.",
    image: "https://upload.wikimedia.org/axolotl.jpg",
  }),
}));

const ANIMALS = [
  {
    id: "a1",
    name: "Cosmo",
    species: "Axolotl",
    species_latin: "Ambystoma mexicanum",
    notes: "Likes worms",
  },
  { id: "a2", name: "Echo", species: "Axolotl" },
] as any[];

describe("AnimalCardScene", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("shows the first animal's name, species, and notes", async () => {
    render(<AnimalCardScene animals={ANIMALS} cardMs={1000} />);
    expect(screen.getByText("Cosmo")).toBeInTheDocument();
    expect(screen.getByText(/Ambystoma mexicanum/)).toBeInTheDocument();
    expect(screen.getByText(/Likes worms/)).toBeInTheDocument();
  });

  it("shows the Wikipedia extract once loaded", async () => {
    render(<AnimalCardScene animals={ANIMALS} cardMs={1000} />);
    expect(
      await screen.findByText(/A paedomorphic salamander/)
    ).toBeInTheDocument();
  });

  it("advances to the next animal after cardMs", async () => {
    render(<AnimalCardScene animals={ANIMALS} cardMs={1000} />);
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    expect(screen.getByText("Echo")).toBeInTheDocument();
    expect(screen.queryByText("Cosmo")).toBeNull();
  });

  it("renders nothing when there are no animals", () => {
    const { container } = render(<AnimalCardScene animals={[]} cardMs={1000} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `CI=true npx react-scripts test --watchAll=false AnimalCardScene` → FAIL (module not found).
- [ ] **Step 3: Implement** — `ui/src/components/AnimalCardScene.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Animal } from "aquario-models";
import { DateTime } from "luxon";
import { getSpeciesInfo, SpeciesInfo } from "../dal/Species.dal";
import { animalImageSrc } from "./AnimalCard";

// Slow drift keeps text off any one set of pixels (burn-in) without
// being noticeable card-to-card.
const DRIFT = ["translate(0, 0)", "translate(2%, 2%)", "translate(-2%, 1%)", "translate(1%, -2%)"];

function lastFedLabel(animal: Animal): string | null {
  const ts = animal.last_feeding_log?.timestamp;
  if (!ts) return null;
  const rel = DateTime.fromISO(ts).toRelative();
  return rel ? `Last fed ${rel}` : null;
}

export default function AnimalCardScene({
  animals,
  cardMs = 25_000,
}: {
  animals: Animal[];
  cardMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [info, setInfo] = useState<SpeciesInfo | null>(null);
  const animal = animals.length ? animals[index % animals.length] : undefined;

  useEffect(() => {
    if (animals.length < 2) return;
    const t = setInterval(() => setIndex((i) => i + 1), cardMs);
    return () => clearInterval(t);
  }, [cardMs, animals.length]);

  useEffect(() => {
    let cancelled = false;
    setInfo(null);
    getSpeciesInfo(animal?.species_latin || animal?.species).then((r) => {
      if (!cancelled) setInfo(r);
    });
    return () => {
      cancelled = true;
    };
  }, [animal?.id]);

  if (!animal) return null;

  const backdrop = animalImageSrc(animal.image_url) ?? info?.image;
  const fed = lastFedLabel(animal);

  return (
    <div
      key={animal.id + ":" + index}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#fff",
        animation: "screensaver-fade-in 1.2s ease both",
      }}
    >
      {backdrop && (
        <img
          src={backdrop}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.35)",
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          maxWidth: "70%",
          transform: DRIFT[index % DRIFT.length],
          transition: "transform 2s ease",
        }}
      >
        <div style={{ fontSize: "4.5rem", fontWeight: 700 }}>{animal.name}</div>
        <div style={{ fontSize: "1.8rem", opacity: 0.85 }}>
          {animal.species}
          {animal.species_latin ? (
            <span style={{ fontStyle: "italic" }}> — {animal.species_latin}</span>
          ) : null}
        </div>
        {fed && (
          <div style={{ fontSize: "1.4rem", marginTop: 12, opacity: 0.8 }}>
            {fed}
          </div>
        )}
        {animal.notes && (
          <div style={{ fontSize: "1.3rem", marginTop: 12, opacity: 0.8 }}>
            {animal.notes}
          </div>
        )}
        {info?.extract && (
          <div
            style={{
              fontSize: "1.25rem",
              marginTop: 20,
              opacity: 0.7,
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {info.extract}
          </div>
        )}
      </div>
    </div>
  );
}
```

Note: `Animal.image_url` — confirm the field exists on the model (`grep image_url models/src/Animal.model.ts`); if it is absent from the TS model but present in API rows (it is referenced in `TankDetail.tsx` via `a.image_url`), cast as the existing code does (`(animal as any).image_url`) to match precedent.

- [ ] **Step 4: Run tests to verify they pass** — 4 passing.
- [ ] **Step 5: Commit** — `"Add rotating animal card scene component for the screensaver"`

---

### Task 3: Scene cycling + sump lockout banner in Screensaver

**Files:**
- Modify: `ui/src/components/Screensaver.tsx`
- Modify: `ui/src/components/Screensaver.test.tsx`

**Interfaces:**
- Consumes: `AnimalCardScene` (Task 2), `getAnimals` from `../dal/Animal.dal`, `initWebSocket`/`onMessage` from `../dal/Maintenance.dal`, `System` from `aquario-models`.
- Produces: exported constants `VIDEO_SCENE_MS = 90_000`, `CARD_MS = 25_000` (tests import them).

- [ ] **Step 1: Extend the tests** — add to `Screensaver.test.tsx` (keep every existing test; extend the module mocks at the top):

```tsx
jest.mock("../dal/Animal.dal", () => ({
  getAnimals: jest.fn().mockResolvedValue([]),
}));
let wsHandler: ((evt: any) => void) | null = null;
jest.mock("../dal/Maintenance.dal", () => ({
  initWebSocket: jest.fn(),
  onMessage: jest.fn((cb: any) => {
    wsHandler = cb;
  }),
}));
```

New test cases (import `getAnimals` mock and `VIDEO_SCENE_MS`, `CARD_MS` from `./Screensaver`; import `System` from `aquario-models`):

```tsx
  const ANIMALS = [
    { id: "a1", name: "Cosmo", species: "Axolotl" },
    { id: "a2", name: "Echo", species: "Axolotl" },
  ];

  it("switches from video to animal cards after the video scene", async () => {
    (getAnimals as jest.Mock).mockResolvedValue(ANIMALS);
    renderSaver(1000);
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    expect(document.querySelector("video")).not.toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(VIDEO_SCENE_MS + 10);
    });
    expect(document.querySelector("video")).toBeNull();
    expect(screen.getByText("Cosmo")).toBeInTheDocument();
  });

  it("returns to the video after all cards have shown", async () => {
    (getAnimals as jest.Mock).mockResolvedValue(ANIMALS);
    renderSaver(1000);
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    await act(async () => {
      jest.advanceTimersByTime(VIDEO_SCENE_MS + 10);
    });
    await act(async () => {
      jest.advanceTimersByTime(ANIMALS.length * CARD_MS + 10);
    });
    expect(document.querySelector("video")).not.toBeNull();
  });

  it("stays on the video when there are no animals", async () => {
    (getAnimals as jest.Mock).mockResolvedValue([]);
    renderSaver(1000);
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    await act(async () => {
      jest.advanceTimersByTime(VIDEO_SCENE_MS * 2);
    });
    expect(document.querySelector("video")).not.toBeNull();
  });

  it("shows the sump lockout banner when a lockout broadcast arrives", async () => {
    renderSaver(1000);
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    act(() => {
      wsHandler?.({
        data: JSON.stringify({
          action: "sump_state",
          data: { state: 4 },
        }),
      });
    });
    expect(screen.getByText(/SUMP LOCKED OUT/i)).toBeInTheDocument();
    act(() => {
      wsHandler?.({
        data: JSON.stringify({
          action: "sump_state",
          data: { state: 0 },
        }),
      });
    });
    expect(screen.queryByText(/SUMP LOCKED OUT/i)).toBeNull();
  });
```

Note the AnimalCardScene's own Species fetch: also add `jest.mock("../dal/Species.dal", () => ({ getSpeciesInfo: jest.fn().mockResolvedValue(null) }));` so card tests don't hit axios.

- [ ] **Step 2: Run to verify the new tests fail** — `CI=true npx react-scripts test --watchAll=false Screensaver` → new cases FAIL (constants not exported, no scene logic), old cases pass.
- [ ] **Step 3: Implement in `Screensaver.tsx`:**
  - New imports: `AnimalCardScene`, `getAnimals`, `initWebSocket`/`onMessage`, `Animal`/`System` from `aquario-models`.
  - Export constants: `export const VIDEO_SCENE_MS = 90_000;` and `export const CARD_MS = 25_000;`
  - Component state: `const [scene, setScene] = useState<"video" | "cards">("video");`, `const [animals, setAnimals] = useState<Animal[]>([]);`, `const [sumpLockedOut, setSumpLockedOut] = useState(false);`
  - On activation, load animals and reset the scene:

```tsx
  useEffect(() => {
    if (!active) {
      setScene("video");
      return;
    }
    getAnimals()
      .then(setAnimals)
      .catch(() => setAnimals([]));
  }, [active]);
```

  - Scene cycle:

```tsx
  useEffect(() => {
    if (!active) return;
    if (scene === "video") {
      if (animals.length === 0) return; // nothing to show — stay on video
      const t = setTimeout(() => setScene("cards"), VIDEO_SCENE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => setScene("video"),
      Math.max(1, animals.length) * CARD_MS
    );
    return () => clearTimeout(t);
  }, [active, scene, animals]);
```

  - Sump lockout listener (once, on mount — the WS layer keeps the socket alive app-wide):

```tsx
  useEffect(() => {
    initWebSocket();
    onMessage((event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.action === System.ServiceUpdate.SUMP_STATE) {
          setSumpLockedOut(msg.data?.state === System.SumpState.LOCKED_OUT);
        }
      } catch {
        // non-JSON frames (hello message) — ignore
      }
    });
  }, []);
```

  - Render: inside the overlay div, replace the bare `<video …/>` with the scene switch, and add the banner above `<TempStatusOverlay />`:

```tsx
      {scene === "video" ? (
        <video
          src="/media/cosmo-echo-vid-2-loop.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <AnimalCardScene animals={animals} cardMs={CARD_MS} />
      )}
      {sumpLockedOut && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "16px",
            textAlign: "center",
            backgroundColor: "#b71c1c",
            color: "#fff",
            fontSize: "2rem",
            fontWeight: 700,
            zIndex: 1,
          }}
        >
          🚨 SUMP LOCKED OUT — CHECK WATER LEVEL
        </div>
      )}
      <TempStatusOverlay />
```

- [ ] **Step 4: Run the full UI suite** — `CI=true npx react-scripts test --watchAll=false` → all suites pass. `npx tsc --noEmit` in `ui` passes.
- [ ] **Step 5: Commit** — `"Alternate screensaver between video and animal cards; add sump lockout banner"`

---

### Task 4: Deploy + kiosk verification

- [ ] **Step 1:** scp changed `ui/src` files (and `models/lib` if the sump plan's model changes haven't been synced yet) to `exopet@exopet-ui.local:~/exopet/`; restart `exopet-kiosk.service`; confirm recompile via `journalctl -u exopet-kiosk.service | grep -i compiled`.
- [ ] **Step 2:** Headless probe: `curl -s http://192.168.5.64:3000` returns 200 (dev server up). On-screen check (or ask Steven to glance at the kiosk): after 5 idle minutes the video shows; ~90s later the animal cards rotate (Cosmo/Echo with Wikipedia axolotl photo/summary once fetched); after the cards, video returns; a tap lands back on the app.
- [ ] **Step 3:** Offline check: with Wi-Fi briefly disabled on the kiosk (or hub unreachable), cards render name/species/notes with no error UI.
- [ ] **Step 4:** Final commit + push of any deploy-driven fixes.
