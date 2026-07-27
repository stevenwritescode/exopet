# ExoPet Benefit Graphics & Animations — Design

**Date:** 2026-07-27
**Status:** Approved for planning

## Goal

Create informational graphics and animations that communicate the benefits of the
ExoPet system — automated water changes, auto top-off, feeding/care logging, and
monitoring/alerts — to DIY builders, aquarium/reef hobbyists, and everyday pet
keepers. Primary deliverable: animated benefit sections on the Next.js website.
The same artwork later derives social media graphics and kiosk/iOS onboarding
screens.

## Approach

Hand-authored inline SVG scenes animated with CSS keyframes, triggered by an
IntersectionObserver when scrolled into view. No new runtime dependencies;
compatible with the site's static export (`output: 'export'`). Flat editorial
illustration style in the existing brand palette (paper `#faf9f6`, ink
`#1a1f1d`, teal `#0e6f5c`, amber `#b98a3d`) with Fraunces display headlines.

Rejected alternatives: Lottie (richer motion but adds a dependency, external
design tooling, and assets not reusable as React SVG components) and
canvas/Framer Motion interactive scenes (heaviest to build; interactivity does
not translate to social or kiosk).

## Placement & structure

A new **"Why ExoPet"** benefits band on the homepage: four full-width rows,
alternating illustration/text left-right. Each row pairs an animated SVG scene
with a headline and 2–3 sentences of benefit copy.

- Scenes animate once when scrolled into view (`is-visible` class via a shared
  `useInView` hook), consistent with the site's existing rise/reveal system.
- `prefers-reduced-motion: reduce` renders the final frame as a static
  illustration (no motion).
- After a sequence completes, scenes hold a subtle idle state (e.g., water
  shimmer); the ATO scene loops seamlessly by design.

## Scene storyboards

### 1. Automated water changes — "Water changes while you sleep."

Side-view display tank with sump below, hub/HAT box beside it, drain and fill
lines plumbed through valve icons.

Sequence:
1. Schedule chip ("Sun · 3:00 AM") lights up.
2. Drain valve opens (teal pulse); water level drops; outgoing water tinted
   slightly amber.
3. Fill valve opens; fresh teal water rises back to the fill line.
4. Checkmark chip appears with log entry: "10% changed · 4 min."
5. Idle: gentle water-surface shimmer.

Copy angle: consistent parameters without hauling buckets; fail-closed valves
and anti-siphon plumbing for hobbyists who will ask.

### 2. Auto top-off — "Evaporation, handled."

Infinite seamless loop: dotted target line on the tank, subtle heat squiggles
above the surface. Level slowly creeps down → float switch icon tips → dosing
pump pulses → level eases back to the line.

Copy angle: stable water level and salinity; float switch plus a failsafe run
timeout.

### 3. Feeding & care logging — "Every feeding, remembered."

Animal profile card (circular photo — Cosmo or Echo from `media/`) beside a
phone frame. Tap ripple on "Log feeding" → entry chip (food icon + date) slides
into a timeline, previous entries shuffle down, a small history bar chart grows
one bar.

Copy angle: per-animal history you can actually see; catch appetite changes
early; synced across kiosk and iOS.

### 4. Monitoring & alerts — "Know before it's a problem."

Tank with temperature probe; a live sparkline draws itself left-to-right beneath
an amber threshold band. Line drifts toward the band → alert badge pops on a
phone frame → relay/heater icon toggles → line settles back.

Copy angle: real-time on kiosk and iOS; thresholds you set; **local-first** —
runs on your network with no cloud required and no subscription to keep it
running. Forward-looking line: optional encrypted backup and remote access are
on the roadmap — the cloud is optional, never required.

## Messaging constraint (applies to all copy)

Do not claim "no cloud, ever." Internet backup and remote access are planned
features. All copy frames the architecture as *local-first / cloud-optional* so
it remains true after those features ship.

## Components

```
website/src/components/benefits/
  WaterChangeScene.tsx
  AtoScene.tsx
  FeedingLogScene.tsx
  MonitoringScene.tsx
  useInView.ts            // shared hook: adds is-visible when scrolled into view
  primitives.tsx          // TankGlass, WaterFill (animated clipPath), PulseDot, Chip
  benefits.css            // keyframes + scene styles, reduced-motion overrides
```

- All motion is CSS keyframes gated by the in-view class; water levels animate
  via `clipPath` rect transforms.
- Each scene accepts a `variant` prop: `wide` (site), `square` / `portrait`
  (social crops). Only the prop plumbing is built now.

## Derivation paths (later phases, not built now)

- **Social:** a dev-only `/graphics` page renders every scene in each aspect
  variant for clean screenshots. No separate asset pipeline.
- **Kiosk/iOS onboarding:** kiosk imports the same scene components into the
  `ui/` React app; iOS re-renders stills or re-implements loops natively.

## Verification

- Scenes trigger once on scroll; ATO loops without a visible seam.
- `prefers-reduced-motion` shows static final frames.
- Lighthouse performance does not regress (inline SVG + CSS only).
- Visual check in the running site (desktop and mobile widths).

## Out of scope

- Rendered video clips / YouTube assets.
- Building the social export page or kiosk onboarding screens (design only
  ensures the components support them).
- Any backend or product changes.
