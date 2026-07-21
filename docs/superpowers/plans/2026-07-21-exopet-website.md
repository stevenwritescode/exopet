# ExoPet Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static Next.js website in `website/` that teaches people to build an ExoPet (guide + affiliate supplies list), offers STL downloads, and collects kit waitlist signups.

**Architecture:** Next.js App Router with `output: 'export'` — every page pre-rendered to static HTML. All content lives in typed data files under `src/data/`; pages render that data through shared components. No backend; the waitlist form posts to a configurable form-service endpoint with a `mailto:` fallback.

**Tech Stack:** Next.js 15, React 19, TypeScript. No CSS framework — hand-written CSS (clean product-brand aesthetic, built under the `frontend-design` skill).

## Global Constraints

- Site lives entirely in `website/`; do not modify `api/`, `ui/`, `models/`, or `ios/`.
- `next.config.ts` must set `output: 'export'` (static export). No server components requiring runtime, no API routes, no `next/image` optimization (use `images: { unoptimized: true }`).
- All affiliate/product links flow through `buildAffiliateUrl()` in `src/data/affiliate.ts`. `AMAZON_TAG = ''` placeholder — empty tag returns the raw URL.
- Waitlist endpoint constant `WAITLIST_ENDPOINT = ''` in `src/data/site.ts`; empty → form falls back to `mailto:steven@livication.com`.
- Footer on every page includes the one-line affiliate disclosure linking to `/legal/affiliate-disclosure`.
- STL downloads point at `/stl/<file>.stl`; ship placeholder files under `public/stl/`.
- Guide content must match the real repo: API on port 3001, Docker Compose with `/dev/gpiomem` device passthrough, Bonjour discovery, kiosk boots via systemd service running `start-kiosk.sh` (React dev server on :3000 + Electron kiosk).
- Verification for every task: `npx tsc --noEmit` clean and `npm run build` succeeds (static export).

---

### Task 1: Scaffold Next.js app with static export

**Files:**
- Create: `website/package.json`, `website/next.config.ts`, `website/tsconfig.json`, `website/next-env.d.ts` (generated), `website/src/app/layout.tsx`, `website/src/app/page.tsx` (placeholder), `website/src/app/globals.css` (empty for now), `website/.gitignore`

**Interfaces:**
- Produces: working `npm run dev` / `npm run build` in `website/`; `layout.tsx` exporting root layout with `<Header/>`/`<Footer/>` slots added in Task 3.

- [ ] **Step 1: Create package.json and install**

```json
{
  "name": "exopet-website",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0"
  }
}
```

Run: `cd website && npm install`

- [ ] **Step 2: next.config.ts**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
```

- [ ] **Step 3: tsconfig.json, .gitignore, minimal layout + home placeholder**

tsconfig: standard Next.js TS config with `"paths": {"@/*": ["./src/*"]}`.
`.gitignore`: `node_modules/`, `.next/`, `out/`.
`layout.tsx`: html/body wrapper, metadata `{ title: 'ExoPet — Automate any habitat', description: 'Open-source habitat automation for aquariums, terrariums, and more.' }`, imports `globals.css`.
`page.tsx`: `<main><h1>ExoPet</h1></main>` placeholder (replaced in Task 4).

- [ ] **Step 4: Verify build**

Run: `npm run build` → succeeds, `out/index.html` exists.

- [ ] **Step 5: Commit** — `git add website && git commit -m "Scaffold ExoPet website (Next.js static export)"`

---

### Task 2: Data layer

**Files:**
- Create: `website/src/data/site.ts`, `website/src/data/affiliate.ts`, `website/src/data/parts.ts`, `website/src/data/guide.ts`, `website/src/data/stls.ts`, `website/src/data/kits.ts`

**Interfaces (Produces — later tasks import exactly these):**

```ts
// site.ts
export const WAITLIST_ENDPOINT = '';           // e.g. https://formspree.io/f/xxxx
export const CONTACT_EMAIL = 'steven@livication.com';
export const GITHUB_URL = 'https://github.com/exopet/exopet'; // placeholder repo URL

// affiliate.ts
export const AMAZON_TAG = '';                  // e.g. 'exopet-20'
export function buildAffiliateUrl(url: string): string; // appends ?tag= for amazon.com URLs when AMAZON_TAG set; otherwise returns url unchanged

// parts.ts
export type PartCategory = 'compute' | 'electronics' | 'plumbing' | 'power' | 'tools';
export interface Part {
  id: string; name: string; description: string; category: PartCategory;
  vendorUrl: string; priceEstimate: string;    // '$45'
  quantity: string;                            // '1', '2', 'as needed'
  optional?: boolean;
}
export const parts: Part[];
export function partById(id: string): Part;    // throws on unknown id (catches typos at build time)

// guide.ts
export interface CodeSnippet { language: string; code: string; }
export interface GuideStep {
  title: string; body: string[];               // paragraphs
  code?: CodeSnippet[]; partIds?: string[];    // parts used in this step
  imageAlt?: string;                           // photo placeholder caption
}
export interface Walkthrough {
  slug: 'api-hub' | 'touchscreen'; title: string; intro: string;
  duration: string; difficulty: string; steps: GuideStep[];
}
export const walkthroughs: Walkthrough[];

// stls.ts
export interface StlModel {
  id: string; name: string; description: string; file: string; // '/stl/hub-case.stl'
  material: string; infill: string; supports: boolean; printTime: string;
}
export const stlModels: StlModel[];

// kits.ts
export interface Kit {
  id: string; name: string; tagline: string; expectedPrice: string;
  contents: string[];
}
export const kits: Kit[];
```

- [ ] **Step 1: affiliate.ts + site.ts** — implement exactly as above; `buildAffiliateUrl` logic:

```ts
export function buildAffiliateUrl(url: string): string {
  if (!AMAZON_TAG || !url.includes('amazon.com')) return url;
  const u = new URL(url);
  u.searchParams.set('tag', AMAZON_TAG);
  return u.toString();
}
```

- [ ] **Step 2: parts.ts** — populate the real supplies list (plain Amazon/vendor search-or-product URLs, no tags). Required entries at minimum:
  - compute: Raspberry Pi 4 (2GB+) ×2, 32GB microSD ×2, USB-C power supply ×2, official Raspberry Pi 7" touchscreen, touchscreen case/stand
  - electronics: 8-channel 5V relay board, DS18B20 waterproof temperature sensor, jumper wires (F-F), 4.7kΩ resistor, waterproof cable glands
  - plumbing: 12V peristaltic dosing pumps ×2, 12V solenoid valves ×2, submersible return pump, airline + silicone tubing, check valves, sump container
  - power: 12V 5A power supply, DC barrel jack splitters, inline fuse holders
  - tools (optional): wire strippers, small screwdriver set, drill + step bit
- [ ] **Step 3: guide.ts** — write both walkthroughs with real content:
  - `api-hub` (~8 steps): 1) Flash Raspberry Pi OS Lite with SSH enabled (Raspberry Pi Imager), 2) Boot + SSH in, install git/Docker (`curl -fsSL https://get.docker.com | sh`), 3) Clone the ExoPet repo, 4) Wire the relay board to GPIO (5V/GND + channel pins) and connect pumps/valves through relay contacts with the 12V supply, 5) Connect the DS18B20 with the 4.7kΩ pull-up and enable 1-Wire, 6) Start the hub with `docker compose up -d` (note `/dev/gpiomem` passthrough, port 3001), 7) Verify: `curl http://<pi-ip>:3001` health check, 8) Confirm Bonjour discovery from the iOS app / UI.
  - `touchscreen` (~6 steps): 1) Assemble Pi + official 7" touchscreen (DSI ribbon, power), 2) Flash full Raspberry Pi OS (desktop), 3) Clone repo, `npm install` in `ui/`, 4) Install the kiosk systemd service that runs `start-kiosk.sh` on boot (show unit file), 5) Reboot into Electron kiosk mode, 6) Point the UI at the hub (Bonjour auto-discovery or manual IP:3001).
  - Every step: 1–3 body paragraphs, code snippets where commands exist, `partIds` referencing parts.ts, `imageAlt` captions.
- [ ] **Step 4: stls.ts** — 6 catalog entries: hub-case, relay-mount, touchscreen-stand, sensor-probe-holder, dosing-pump-bracket, cable-comb. Real print settings (e.g. PETG for anything near water, 20–30% infill).
- [ ] **Step 5: kits.ts** — 3 kits: Hub Kit (~$199), Full Aquarium Kit (~$449), Terrarium Kit (~$379), each with contents drawn from parts list + pre-flashed SD cards + printed parts.
- [ ] **Step 6: Verify** — `npx tsc --noEmit` clean. Commit: `"Add website data layer: parts, guide, STLs, kits, affiliate config"`

---

### Task 3: Design system, layout, header/footer

**Files:**
- Create: `website/src/components/Header.tsx`, `website/src/components/Footer.tsx`
- Modify: `website/src/app/globals.css`, `website/src/app/layout.tsx`

**Interfaces:**
- Produces: `<Header/>` (logo wordmark + nav: Guide, Downloads, Shop), `<Footer/>` (affiliate disclosure line linking `/legal/affiliate-disclosure`, contact email, GitHub link). Layout renders Header/Footer around `{children}`.

- [ ] **Step 1:** Invoke the `frontend-design:frontend-design` skill for this and all remaining UI tasks. Establish the design system in `globals.css`: CSS custom properties (light background, near-black text, one accent color, spacing scale, type scale), base element styles. Clean product-brand: generous whitespace, minimal borders, no dark theme.
- [ ] **Step 2:** Implement Header (sticky, wordmark "ExoPet", nav links) and Footer (disclosure: "Some links on this site are affiliate links. ExoPet may earn a commission at no cost to you." + legal link + © line). Wire into `layout.tsx`.
- [ ] **Step 3:** Verify `npm run build`; check rendering via dev server. Commit: `"Add website design system, header, and footer"`

---

### Task 4: Home page

**Files:**
- Modify: `website/src/app/page.tsx`

- [ ] **Step 1:** Hero: headline "Automate any habitat.", subhead about open-source monitoring/automation for aquariums, terrariums, vivariums; CTAs "Build your own" → `/guide` and "Get the kit" → `/shop`.
- [ ] **Step 2:** Feature grid (from real capabilities): scheduled water changes, pump & valve control, temperature monitoring, touchscreen + iOS control, local-first (no cloud required).
- [ ] **Step 3:** Three-pathway section: Build it yourself → `/guide`; Print the parts → `/downloads`; Get the kit → `/shop`.
- [ ] **Step 4:** Verify build + dev-server render. Commit: `"Add website home page"`

---

### Task 5: Guide index with supplies list

**Files:**
- Create: `website/src/app/guide/page.tsx`, `website/src/components/PartRow.tsx`

**Interfaces:**
- Consumes: `parts`, `buildAffiliateUrl` from data layer.
- Produces: `<PartRow part={Part}/>` — name, description, qty, price estimate, "Buy" link (`buildAffiliateUrl(part.vendorUrl)`, `target="_blank" rel="noopener sponsored"`).

- [ ] **Step 1:** Page intro + two walkthrough cards (title, duration, difficulty from `walkthroughs`) linking to `/guide/api-hub` and `/guide/touchscreen`.
- [ ] **Step 2:** Supplies list grouped by `PartCategory` with section headings; render `PartRow` per part; note flagging `optional` items; inline affiliate disclosure sentence above the list.
- [ ] **Step 3:** Verify + commit: `"Add guide index with affiliate supplies list"`

---

### Task 6: Walkthrough pages

**Files:**
- Create: `website/src/app/guide/[slug]/page.tsx`, `website/src/components/StepCard.tsx`, `website/src/components/CodeBlock.tsx`

**Interfaces:**
- Consumes: `walkthroughs`, `partById`.
- Produces: `generateStaticParams()` returning both slugs; `<CodeBlock snippet={CodeSnippet}/>` (client component, copy-to-clipboard button); `<StepCard step={GuideStep} index={number}/>` — numbered card: title, paragraphs, code blocks, photo placeholder (styled div with `imageAlt` caption), "Parts used in this step" callout linking to `/guide#<part-id>`.

- [ ] **Step 1:** Implement `CodeBlock` (`'use client'`, `navigator.clipboard.writeText`, "Copied" state) and `StepCard`.
- [ ] **Step 2:** Implement `[slug]/page.tsx` with `generateStaticParams`; header (title, intro, duration/difficulty badges), steps list, footer cross-link to the other walkthrough.
- [ ] **Step 3:** Verify both pages in `out/`, click-test copy button in dev. Commit: `"Add API hub and touchscreen walkthrough pages"`

---

### Task 7: Downloads page + placeholder STLs

**Files:**
- Create: `website/src/app/downloads/page.tsx`, `website/src/components/StlCard.tsx`, `website/public/stl/<id>.stl` ×6

**Interfaces:**
- Consumes: `stlModels`.

- [ ] **Step 1:** Generate 6 minimal valid ASCII STL placeholder files (single-triangle solid) named per `stls.ts` `file` fields.
- [ ] **Step 2:** `StlCard`: preview placeholder, name, description, print-settings row (material / infill / supports / time), download button (`<a href={model.file} download>`).
- [ ] **Step 3:** Page: intro, license note (CC BY-NC 4.0), card grid. Verify STLs copied into `out/stl/`. Commit: `"Add STL downloads page with placeholder models"`

---

### Task 8: Shop page + waitlist form

**Files:**
- Create: `website/src/app/shop/page.tsx`, `website/src/components/KitCard.tsx`, `website/src/components/WaitlistForm.tsx`

**Interfaces:**
- Consumes: `kits`, `WAITLIST_ENDPOINT`, `CONTACT_EMAIL`.
- Produces: `<WaitlistForm kitName={string}/>` — client component; email input + submit. If `WAITLIST_ENDPOINT` set → `fetch` POST `{email, kit}` and show success/error state; else → `mailto:${CONTACT_EMAIL}?subject=ExoPet waitlist: <kit>` link styled as the submit button.

- [ ] **Step 1:** Implement `WaitlistForm` with both modes and inline status messages.
- [ ] **Step 2:** `KitCard`: name, tagline, expected price ("expected price — kits not yet on sale"), contents list, embedded `WaitlistForm`.
- [ ] **Step 3:** Shop page: intro ("Kits are in development…"), kit grid, page-level general waitlist. Verify + commit: `"Add shop page with kit waitlist"`

---

### Task 9: Affiliate disclosure page + final verification

**Files:**
- Create: `website/src/app/legal/affiliate-disclosure/page.tsx`
- Create: `website/README.md`

- [ ] **Step 1:** Disclosure page: FTC-style plain-language disclosure (affiliate relationships, Amazon Associates mention, commissions at no extra cost, kit waitlist collects email only).
- [ ] **Step 2:** `website/README.md`: how to run/build, where to set `AMAZON_TAG` and `WAITLIST_ENDPOINT`, how to replace placeholder STLs and photos, deploy notes (any static host).
- [ ] **Step 3:** Final verification: `npx tsc --noEmit`; `npm run build`; confirm `out/` contains index, guide (+2 slugs), downloads, shop, legal pages and `stl/` files; spot-check every page in dev server.
- [ ] **Step 4:** Commit: `"Add affiliate disclosure page and website README"`
