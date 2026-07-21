# ExoPet Website — Design Spec

> **Date:** 2026-07-21
> **Status:** Approved by Steven
> **Location:** new `website/` directory in this repo

## Purpose

A public-facing static website that teaches people to build their own ExoPet
habitat automation system, monetized through affiliate links on the supplies
list and a waitlist for future pre-made kits.

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Shop model | Waitlist / pre-order interest only — no checkout |
| Stack | Next.js (App Router, TypeScript), `output: 'export'` static export |
| STL files | Placeholder download slots; real STLs dropped in later |
| Affiliate links | Placeholder plain vendor URLs; single config to add tags later |
| Visual style | Clean product-brand: light, minimal, Apple-ish |
| Content architecture | Data-driven: typed TS data files rendered by React components |

## Pages

- **Home `/`** — hero ("Automate any habitat"), feature overview (pumps,
  valves, dosing, scheduled water changes, monitoring), three pathways:
  Build it yourself → `/guide`, Print the parts → `/downloads`,
  Get the kit → `/shop`.
- **Guide `/guide`** — supplies list (every part with affiliate-linked buy
  button) + table of contents for the walkthroughs.
- **Guide: API hub `/guide/api-hub`** — instructables-style numbered steps:
  flash Raspberry Pi OS, clone repo, install Node deps, run via Docker
  Compose (`/dev/gpiomem` passthrough, port 3001), wire relays to pumps and
  valves, verify with health check and Bonjour discovery.
- **Guide: Touchscreen `/guide/touchscreen`** — second Pi + official 7"
  touchscreen: install UI, kiosk autostart via systemd + `start-kiosk.sh`,
  Electron kiosk mode, connect to the hub.
- **Downloads `/downloads`** — STL catalog: part cards with name,
  description, print settings (material/infill/supports), preview
  placeholder, download button pointing at `/stl/<file>.stl` placeholder
  paths. License note (CC BY-NC 4.0 default).
- **Shop `/shop`** — kit cards (Hub Kit, Full Aquarium Kit, Terrarium Kit)
  with contents, expected price, per-kit and page-level waitlist email form.
- **Legal `/legal/affiliate-disclosure`** — FTC affiliate disclosure page;
  short disclosure line in the shared footer.

## Guide step anatomy

Each step renders as a numbered card: title, prose, optional code blocks
with copy buttons, photo placeholder slot, "parts used in this step"
callout linking back to the supplies list.

## Data layer (`website/src/data/`)

- `parts.ts` — supply items: name, description, category, vendor URL,
  price estimate, guide-step references.
- `affiliate.ts` — link builder appending the affiliate tag when configured
  (`AMAZON_TAG = ''` placeholder). One-line change activates links site-wide.
- `guide.ts` — typed steps for both walkthroughs, grounded in real repo
  setup (api/docker-compose.yml, ui/start-kiosk.sh).
- `stls.ts` — STL catalog entries.
- `kits.ts` — kit definitions for the shop.

## Waitlist form

Form component posts to a form-service endpoint held in one config constant
(placeholder until an account exists). Until configured, falls back to a
`mailto:` link to steven@livication.com so the form is never dead.

## Verification

- `npm run build` produces a clean static export.
- Pages verified rendering via dev server.
- TypeScript type-checking passes. No test framework beyond that for a
  content site.

## Out of scope (YAGNI)

Real checkout, CMS, user accounts, analytics, blog.
