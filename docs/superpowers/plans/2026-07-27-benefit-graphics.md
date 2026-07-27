# Benefit Graphics & Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an animated "Why ExoPet" benefits band to the website homepage: four inline-SVG scenes (water changes, auto top-off, feeding logs, monitoring/alerts) animated with CSS keyframes, triggered on scroll.

**Architecture:** Hand-authored SVG scenes as React components under `website/src/components/benefits/`. A shared `useInView` hook adds an `is-visible` class when a scene scrolls into view; all motion is CSS keyframes gated by that class. Base SVG styles are authored as the **final frame**; keyframes animate from the start state, so `prefers-reduced-motion` (which disables animation) naturally shows a finished static illustration.

**Tech Stack:** Next.js 15 (App Router, `output: 'export'`), React 19, TypeScript, plain CSS. **No new dependencies.**

**Spec:** `docs/superpowers/specs/2026-07-27-benefit-graphics-design.md`

## Global Constraints

- No new npm dependencies. All animation is CSS keyframes + IntersectionObserver.
- Static-export safe: no server features, no `next/image` optimization (config already has `images: { unoptimized: true }`).
- Brand palette via existing CSS vars: `--paper #faf9f6`, `--ink #1a1f1d`, `--lagoon #0e6f5c`, `--lagoon-tint #e3efec`, `--amber #b98a3d`, `--hairline`, `--paper-raised`, `--paper-sunken`, `--ink-soft`, `--ink-faint`.
- Copy rule (from spec): never claim "no cloud, ever." Frame as **local-first / cloud-optional**; remote access and encrypted backup are "on the roadmap."
- Every scene accepts `variant?: 'wide' | 'square' | 'portrait'` (plumbing only — only `wide` gets a layout now).
- Author base SVG styles as the final frame; keyframes end where the base styles sit. Use `animation-fill-mode: backwards` (or `both`) so delayed elements show their 0% state while waiting.
- SVG `clipPath`/gradient IDs must be prefixed per scene (`wc-`, `ato-`, `feed-`, `mon-`) — scenes share one page.
- Import alias `@/*` → `website/src/*`. All build/dev commands run from `website/`.
- SVG coordinates in this plan are deliberate starting points; after each visual check, small positional adjustments to avoid overlaps are expected and allowed. Timings, class names, and structure are not to be changed casually.
- No test framework exists in `website/`. Verification is `npm run build` (type-checks + static export) plus a visual checklist in the dev server.

## File Structure

```
website/src/components/benefits/
  useInView.ts          # in-view hook ('use client')
  primitives.tsx        # SceneFigure, TankGlass, Chip, PulseDot, PhoneFrame ('use client')
  BenefitRow.tsx        # copy + scene row layout (server-safe)
  benefits.css          # all scene styles/keyframes (grows with each task)
  AtoScene.tsx          # Task 2
  WaterChangeScene.tsx  # Task 3
  FeedingLogScene.tsx   # Task 4
  MonitoringScene.tsx   # Task 5
website/src/app/page.tsx      # modified: "Why ExoPet" section between features and pathways
website/public/img/cosmo.jpg  # Task 4: resized copy of media/Cosmo.jpg
```

---

### Task 1: Shared foundation (hook, primitives, row layout, base CSS)

**Files:**
- Create: `website/src/components/benefits/useInView.ts`
- Create: `website/src/components/benefits/primitives.tsx`
- Create: `website/src/components/benefits/BenefitRow.tsx`
- Create: `website/src/components/benefits/benefits.css`

**Interfaces:**
- Consumes: nothing (first task).
- Produces (later tasks import these exactly):
  - `useInView<T extends Element>(threshold?: number): { ref: RefObject<T | null>; inView: boolean }`
  - `type SceneVariant = 'wide' | 'square' | 'portrait'`
  - `interface SceneProps { variant?: SceneVariant }`
  - `SceneFigure({ variant?, label, viewBox?, children })` — wraps a scene in `<figure class="benefit-scene [is-visible]" data-variant>` + `<svg viewBox="0 0 520 360" class="benefit-svg">`
  - `TankGlass({ x, y, width, height })` — open-top tank outline
  - `Chip({ x, y, width, label, tone?: 'lagoon'|'amber'|'ink', className? })` — 28px-tall pill with centered text
  - `PulseDot({ cx, cy, r?, className? })` — dot with infinite expanding ring
  - `PhoneFrame({ x, y, width, height, children })` — phone body + screen; children render on the screen
  - `BenefitRow({ title, body, scene, reverse? })`
  - CSS classes: `.benefit-scene`, `.is-visible`, `.benefit-svg`, `.benefit-row`, `.benefit-row-reverse`, `.benefit-copy`, `.panel`, `.water-fill`, `.water-surface`, `.chip`, `.chip-lagoon`, `.chip-amber`, `.chip-ink`, `.chip-text`, `.phone-body`, `.phone-screen`, `.pulse-core`, `.pulse-ring`

- [ ] **Step 1: Write `useInView.ts`**

```ts
'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/** True once the element has scrolled into view (fires once, then disconnects). */
export function useInView<T extends Element>(
  threshold = 0.35
): { ref: RefObject<T | null>; inView: boolean } {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
```

- [ ] **Step 2: Write `primitives.tsx`**

```tsx
'use client';

import type { ReactNode } from 'react';
import { useInView } from './useInView';

export type SceneVariant = 'wide' | 'square' | 'portrait';

export interface SceneProps {
  variant?: SceneVariant;
}

/**
 * Outer wrapper for every scene: in-view animation gating + variant plumbing.
 * Only the 'wide' variant has a designed layout today; square/portrait exist
 * for the future social-crop page (see spec).
 */
export function SceneFigure({
  variant = 'wide',
  label,
  viewBox = '0 0 520 360',
  children,
}: {
  variant?: SceneVariant;
  label: string;
  viewBox?: string;
  children: ReactNode;
}) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <figure
      ref={ref}
      className={`benefit-scene${inView ? ' is-visible' : ''}`}
      data-variant={variant}
      role="img"
      aria-label={label}
    >
      <svg viewBox={viewBox} className="benefit-svg" aria-hidden="true">
        {children}
      </svg>
    </figure>
  );
}

/** Open-top aquarium outline (left wall, floor, right wall). */
export function TankGlass({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return (
    <path
      d={`M ${x} ${y} V ${y + height} H ${x + width} V ${y}`}
      fill="none"
      stroke="var(--ink)"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Pill-shaped label chip, 28px tall, text centered. */
export function Chip({
  x,
  y,
  width,
  label,
  tone = 'lagoon',
  className,
}: {
  x: number;
  y: number;
  width: number;
  label: string;
  tone?: 'lagoon' | 'amber' | 'ink';
  className?: string;
}) {
  return (
    <g className={className}>
      <rect x={x} y={y} width={width} height={28} rx={14} className={`chip chip-${tone}`} />
      <text x={x + width / 2} y={y + 19} textAnchor="middle" className="chip-text">
        {label}
      </text>
    </g>
  );
}

/** Solid dot with an infinitely pulsing ring (activity indicator). */
export function PulseDot({
  cx,
  cy,
  r = 6,
  className,
}: {
  cx: number;
  cy: number;
  r?: number;
  className?: string;
}) {
  return (
    <g className={className}>
      <circle cx={cx} cy={cy} r={r} className="pulse-core" />
      <circle cx={cx} cy={cy} r={r} className="pulse-ring" />
    </g>
  );
}

/** Rounded phone body with an inset screen; children render on the screen. */
export function PhoneFrame({
  x,
  y,
  width,
  height,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  children?: ReactNode;
}) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={18} className="phone-body" />
      <rect
        x={x + 6}
        y={y + 6}
        width={width - 12}
        height={height - 12}
        rx={12}
        className="phone-screen"
      />
      {children}
    </g>
  );
}
```

- [ ] **Step 3: Write `BenefitRow.tsx`**

```tsx
import type { ReactNode } from 'react';

export function BenefitRow({
  title,
  body,
  scene,
  reverse = false,
}: {
  title: string;
  body: string;
  scene: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className={`benefit-row${reverse ? ' benefit-row-reverse' : ''}`}>
      <div className="benefit-copy">
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      {scene}
    </div>
  );
}
```

- [ ] **Step 4: Write `benefits.css` (base layer)**

```css
/* ── Benefit scenes: animated SVG illustrations ─────────────
   Convention: base styles are the FINAL frame. Keyframes animate
   from the start state and end at the base values, so disabling
   animation (reduced motion) shows a finished illustration. */

.benefit-scene {
  margin: 0;
}

.benefit-svg {
  width: 100%;
  height: auto;
  display: block;
}

/* Everything is paused until the scene scrolls into view.
   !important is required: scene rules below use the `animation`
   shorthand, which resets play-state to running and would
   otherwise win the cascade at equal specificity. */
.benefit-scene:not(.is-visible) * {
  animation-play-state: paused !important;
}

@media (prefers-reduced-motion: reduce) {
  .benefit-scene * {
    animation: none !important;
  }
}

/* ── Row layout ── */
.benefit-row {
  display: grid;
  grid-template-columns: 5fr 6fr;
  gap: var(--space-6);
  align-items: center;
}
.benefit-row + .benefit-row {
  margin-top: var(--space-7);
}
.benefit-row-reverse .benefit-copy {
  order: 2;
}
.benefit-copy h3 {
  font-size: 1.75rem;
  margin-bottom: var(--space-3);
}
.benefit-copy p {
  color: var(--ink-soft);
}
@media (max-width: 760px) {
  .benefit-row {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  .benefit-row-reverse .benefit-copy {
    order: 0;
  }
}

/* ── Shared scene pieces ── */
.panel {
  fill: var(--paper-raised);
  stroke: var(--hairline);
  stroke-width: 1.5;
}
.water-fill {
  fill: var(--lagoon-tint);
}
.water-surface {
  stroke: var(--lagoon);
  stroke-width: 2.5;
}
.chip-lagoon {
  fill: var(--lagoon-tint);
  stroke: var(--lagoon);
  stroke-width: 1.5;
}
.chip-amber {
  fill: #f5ead7;
  stroke: var(--amber);
  stroke-width: 1.5;
}
.chip-ink {
  fill: var(--paper-sunken);
  stroke: var(--ink-faint);
  stroke-width: 1.5;
}
.chip-text {
  font: 600 13px var(--font-body);
  fill: var(--ink);
}
.phone-body {
  fill: var(--ink);
}
.phone-screen {
  fill: var(--paper-raised);
}
.pulse-core {
  fill: var(--lagoon);
}
.pulse-ring {
  fill: none;
  stroke: var(--lagoon);
  stroke-width: 2;
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  animation: pulse-ring 2s ease-out infinite;
}
@keyframes pulse-ring {
  0% {
    transform: scale(0.6);
    opacity: 0.8;
  }
  70% {
    transform: scale(2);
    opacity: 0;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}
```

- [ ] **Step 5: Verify the build passes**

Run: `cd website && npm run build`
Expected: build succeeds (new files type-check; nothing imports them yet).

- [ ] **Step 6: Commit**

```bash
git add website/src/components/benefits/
git commit -m "Add shared foundation for animated benefit scenes"
```

---

### Task 2: AtoScene + "Why ExoPet" section on the homepage

**Files:**
- Create: `website/src/components/benefits/AtoScene.tsx`
- Modify: `website/src/components/benefits/benefits.css` (append ATO styles)
- Modify: `website/src/app/page.tsx` (insert section between the features grid section and the "Three ways in" pathways section, i.e. between lines 90 and 92 of the current file)

**Interfaces:**
- Consumes: `SceneFigure`, `TankGlass`, `Chip`, `PulseDot`, `SceneProps` from `./primitives`; `BenefitRow` from `@/components/benefits/BenefitRow`.
- Produces: `AtoScene({ variant }: SceneProps)` — a seamless 10s evaporation/top-off loop. The section markup other tasks insert rows into.

- [ ] **Step 1: Write `AtoScene.tsx`**

The loop: level slowly drops 14px (evaporation) → float switch tips → pump pulses and a chip appears → level eases back to the dotted target line.

```tsx
import { SceneFigure, TankGlass, Chip, PulseDot, type SceneProps } from './primitives';

export function AtoScene({ variant }: SceneProps) {
  return (
    <SceneFigure
      variant={variant}
      label="Auto top-off: as water evaporates, a float switch trips and a dosing pump refills the tank to the target line."
    >
      {/* dotted target line */}
      <line x1={70} y1={130} x2={330} y2={130} className="ato-target" />
      {/* water, clipped to the tank interior; the group's translateY is the level */}
      <clipPath id="ato-clip">
        <rect x={63} y={82} width={274} height={196} />
      </clipPath>
      <g clipPath="url(#ato-clip)">
        <g className="ato-water">
          <rect x={63} y={130} width={274} height={160} className="water-fill" />
          <line x1={63} y1={130} x2={337} y2={130} className="water-surface" />
        </g>
      </g>
      <TankGlass x={60} y={80} width={280} height={200} />
      {/* heat squiggles above the surface */}
      <g className="ato-heat">
        <path d="M 150 72 q 4 -8 0 -16 q -4 -8 0 -16" className="squiggle" />
        <path d="M 200 68 q 4 -8 0 -16 q -4 -8 0 -16" className="squiggle" />
        <path d="M 250 72 q 4 -8 0 -16 q -4 -8 0 -16" className="squiggle" />
      </g>
      {/* float switch riding the surface on the right wall */}
      <g className="ato-float">
        <circle cx={310} cy={126} r={9} className="float-body" />
        <line x1={319} y1={126} x2={334} y2={126} className="float-arm" />
      </g>
      {/* dosing pump, supply line into the tank */}
      <rect x={380} y={200} width={70} height={44} rx={8} className="pump-body" />
      <path d="M 380 214 H 352 V 96 H 302 V 86" className="pump-line" />
      <PulseDot cx={415} cy={222} className="ato-pump-on" />
      <Chip x={356} y={140} width={118} label="Top-off · 40 ml" tone="lagoon" className="ato-pump-on" />
    </SceneFigure>
  );
}
```

- [ ] **Step 2: Append ATO styles to `benefits.css`**

All ATO animations share one 10s infinite timeline so the loop is seamless (0% and 100% states are identical).

```css
/* ── ATO scene ── */
.ato-target {
  stroke: var(--amber);
  stroke-width: 2;
  stroke-dasharray: 6 6;
}
.squiggle {
  fill: none;
  stroke: var(--ink-faint);
  stroke-width: 2;
  stroke-linecap: round;
}
.pump-body {
  fill: var(--paper-sunken);
  stroke: var(--ink);
  stroke-width: 2.5;
}
.pump-line {
  fill: none;
  stroke: var(--ink-faint);
  stroke-width: 3;
}
.float-body {
  fill: var(--paper-raised);
  stroke: var(--ink);
  stroke-width: 2.5;
}
.float-arm {
  stroke: var(--ink);
  stroke-width: 2.5;
  stroke-linecap: round;
}

.ato-water {
  animation: ato-level 10s ease-in-out infinite;
}
.ato-float {
  transform-box: fill-box;
  transform-origin: center;
  animation: ato-float 10s ease-in-out infinite;
}
.ato-heat {
  animation: ato-heat 4s ease-in-out infinite;
}
.ato-pump-on {
  animation: ato-pump 10s ease-in-out infinite;
}

@keyframes ato-level {
  0%, 10% { transform: translateY(0); }
  45%, 60% { transform: translateY(14px); }
  90%, 100% { transform: translateY(0); }
}
@keyframes ato-float {
  0%, 10% { transform: translateY(0) rotate(0deg); }
  45%, 60% { transform: translateY(14px) rotate(-16deg); }
  90%, 100% { transform: translateY(0) rotate(0deg); }
}
@keyframes ato-heat {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.9; }
}
@keyframes ato-pump {
  0%, 52% { opacity: 0; }
  58%, 86% { opacity: 1; }
  94%, 100% { opacity: 0; }
}
```

- [ ] **Step 3: Add the "Why ExoPet" section to `page.tsx`**

Add imports at the top of `website/src/app/page.tsx`:

```tsx
import { BenefitRow } from '@/components/benefits/BenefitRow';
import { AtoScene } from '@/components/benefits/AtoScene';
import '@/components/benefits/benefits.css';
```

Insert this section between the features-grid section (ends `</section>` after the `grid-3` of `features`) and the "Three ways in" section:

```tsx
      <section className="section" id="why" style={{ paddingTop: 0 }}>
        <div className="container">
          <span className="eyebrow">Why ExoPet</span>
          <h2 className="page-title" style={{ fontSize: '2.25rem' }}>
            The chores disappear. The animals notice.
          </h2>
          <div style={{ marginTop: 'var(--space-6)' }}>
            <BenefitRow
              reverse
              title="Evaporation, handled."
              body="Water evaporates around the clock, and level and salinity drift with it. A float switch catches the dip, a dosing pump eases the level back to the line, and a run-timeout failsafe makes sure a stuck switch can never flood the room."
              scene={<AtoScene />}
            />
          </div>
        </div>
      </section>
```

(`reverse` is set because this will be row 2 of 4 once the other scenes land; rows alternate.)

- [ ] **Step 4: Verify the build**

Run: `cd website && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Visual check**

Run: `cd website && npm run dev`, open `http://localhost:3000`.
Checklist:
- "Why ExoPet" section appears between the feature grid and "Three ways in".
- ATO scene animates only after scrolling it into view.
- The loop is seamless: level drops, float tips, pump chip + pulse appear, level returns; no jump at the loop point.
- Nothing overlaps illegibly (adjust coordinates if the pump line or chip collides with the tank).

- [ ] **Step 6: Commit**

```bash
git add website/src/components/benefits/ website/src/app/page.tsx
git commit -m "Add ATO benefit scene and Why ExoPet homepage section"
```

---

### Task 3: WaterChangeScene (hero row, inserted first)

**Files:**
- Create: `website/src/components/benefits/WaterChangeScene.tsx`
- Modify: `website/src/components/benefits/benefits.css` (append)
- Modify: `website/src/app/page.tsx` (import scene; insert row ABOVE the ATO row)

**Interfaces:**
- Consumes: `SceneFigure`, `TankGlass`, `Chip`, `PulseDot`, `SceneProps` from `./primitives`.
- Produces: `WaterChangeScene({ variant }: SceneProps)` — one-shot ~7.5s drain/refill sequence, then idle shimmer.

- [ ] **Step 1: Write `WaterChangeScene.tsx`**

Sequence (single 7.5s timeline, played once; all elements share the same duration/delay with different keyframe percentages): schedule chip pulses → drain valve pulses and level drops 36px, drain stream glows amber → fill valve pulses, fill stream glows teal, level returns → "10% changed · 4 min" chip fades in. Hub LED blinks and the surface shimmers forever.

```tsx
import { SceneFigure, TankGlass, Chip, PulseDot, type SceneProps } from './primitives';

export function WaterChangeScene({ variant }: SceneProps) {
  return (
    <SceneFigure
      variant={variant}
      label="Automated water change: on schedule, ExoPet drains a portion of the tank, refills it with fresh water, and logs the change."
    >
      {/* display tank */}
      <clipPath id="wc-clip">
        <rect x={43} y={52} width={244} height={146} />
      </clipPath>
      <g clipPath="url(#wc-clip)">
        <g className="wc-water">
          <rect x={43} y={90} width={244} height={110} className="water-fill" />
          <line x1={43} y1={90} x2={287} y2={90} className="water-surface wc-shimmer" />
        </g>
      </g>
      <TankGlass x={40} y={50} width={250} height={150} />
      {/* sump below */}
      <clipPath id="wc-sump-clip">
        <rect x={93} y={272} width={144} height={56} />
      </clipPath>
      <g clipPath="url(#wc-sump-clip)">
        <rect x={93} y={292} width={144} height={38} className="water-fill" />
        <line x1={93} y1={292} x2={237} y2={292} className="water-surface" />
      </g>
      <TankGlass x={90} y={270} width={150} height={60} />
      <text x={165} y={352} textAnchor="middle" className="scene-label">Sump</text>
      {/* hub */}
      <rect x={320} y={100} width={100} height={64} rx={10} className="hub-body" />
      <text x={370} y={138} textAnchor="middle" className="hub-label">ExoPet</text>
      <circle cx={408} cy={112} r={4} className="hub-led" />
      {/* fresh-water reservoir */}
      <clipPath id="wc-res-clip">
        <rect x={403} y={232} width={74} height={86} />
      </clipPath>
      <g clipPath="url(#wc-res-clip)">
        <rect x={403} y={252} width={74} height={66} className="water-fill" />
        <line x1={403} y1={252} x2={477} y2={252} className="water-surface" />
      </g>
      <TankGlass x={400} y={230} width={80} height={90} />
      <text x={440} y={342} textAnchor="middle" className="scene-label">Fresh water</text>
      {/* drain pipe: tank → down past a valve → sump */}
      <path d="M 290 180 H 315 V 300 H 243" className="pipe" />
      <path d="M 315 190 V 296" className="wc-drain-stream" />
      <PulseDot cx={315} cy={230} className="wc-drain-on" />
      {/* fill pipe: reservoir → up and across → tank */}
      <path d="M 440 230 V 36 H 120 V 50" className="pipe" />
      <path d="M 440 226 V 36 H 120 V 48" className="wc-fill-stream" />
      <PulseDot cx={440} cy={130} className="wc-fill-on" />
      {/* schedule + result chips */}
      <Chip x={150} y={2} width={128} label="Sun · 3:00 AM" tone="ink" className="wc-schedule" />
      <Chip x={50} y={222} width={168} label="10% changed · 4 min" tone="lagoon" className="wc-check" />
    </SceneFigure>
  );
}
```

- [ ] **Step 2: Append water-change styles to `benefits.css`**

```css
/* ── Water change scene ── */
.pipe {
  fill: none;
  stroke: var(--ink-faint);
  stroke-width: 3;
}
.hub-body {
  fill: var(--ink);
}
.hub-label {
  font: 500 15px var(--font-display);
  fill: var(--paper);
}
.hub-led {
  fill: var(--lagoon);
  animation: hub-led 2s ease-in-out infinite;
}
.scene-label {
  font: 500 12px var(--font-body);
  fill: var(--ink-faint);
}
.wc-drain-stream {
  fill: none;
  stroke: var(--amber);
  stroke-width: 5;
  stroke-linecap: round;
  opacity: 0;
}
.wc-fill-stream {
  fill: none;
  stroke: var(--lagoon);
  stroke-width: 5;
  stroke-linecap: round;
  opacity: 0;
}

.wc-water { animation: wc-level 7.5s ease-in-out 0.3s both; }
.wc-schedule {
  transform-box: fill-box;
  transform-origin: center;
  animation: wc-schedule 7.5s ease-in-out 0.3s both;
}
.wc-drain-stream { animation: wc-drain 7.5s ease-in-out 0.3s both; }
.wc-drain-on { animation: wc-drain 7.5s ease-in-out 0.3s both; }
.wc-fill-stream { animation: wc-fill 7.5s ease-in-out 0.3s both; }
.wc-fill-on { animation: wc-fill 7.5s ease-in-out 0.3s both; }
.wc-check { animation: wc-check 7.5s ease-out 0.3s both; }
.wc-shimmer { animation: wc-shimmer 4s ease-in-out 8s infinite; }

@keyframes wc-level {
  0%, 14% { transform: translateY(0); }
  42%, 56% { transform: translateY(36px); }
  88%, 100% { transform: translateY(0); }
}
@keyframes wc-schedule {
  0% { transform: scale(1); }
  6% { transform: scale(1.08); }
  12%, 100% { transform: scale(1); }
}
@keyframes wc-drain {
  0%, 12% { opacity: 0; }
  16%, 40% { opacity: 1; }
  46%, 100% { opacity: 0; }
}
@keyframes wc-fill {
  0%, 54% { opacity: 0; }
  60%, 84% { opacity: 1; }
  92%, 100% { opacity: 0; }
}
@keyframes wc-check {
  0%, 90% { opacity: 0; transform: translateY(6px); }
  98%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes wc-shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
@keyframes hub-led {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}
```

Note: `.wc-check` base styles must end visible — the keyframes end at `opacity: 1`, matching the (unset, therefore visible) base. Reduced motion shows the chip, which is the correct final frame.

- [ ] **Step 3: Insert the row in `page.tsx`**

Add to imports:

```tsx
import { WaterChangeScene } from '@/components/benefits/WaterChangeScene';
```

Insert ABOVE the ATO `<BenefitRow reverse ... />` (water change is row 1, not reversed):

```tsx
            <BenefitRow
              title="Water changes while you sleep."
              body="Schedule a change for 3 AM on Sunday and ExoPet does the rest — drain, refill, log it. Fail-closed solenoids and anti-siphon plumbing mean a power cut leaves the water exactly where it belongs. No buckets, no hoses, no lost weekend."
              scene={<WaterChangeScene />}
            />
```

- [ ] **Step 4: Verify the build**

Run: `cd website && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Visual check**

Run: `cd website && npm run dev`, open `http://localhost:3000`, scroll to the section.
Checklist:
- Sequence reads clearly: schedule chip pulse → level drops with amber drain glow → level refills with teal fill glow → result chip fades in.
- Surface shimmer starts after the sequence and loops gently.
- Pipes don't cross the hub, chips, or text (nudge coordinates if they do).
- Water change row sits above the ATO row; illustration on the right, copy on the left (ATO row is mirrored).

- [ ] **Step 6: Commit**

```bash
git add website/src/components/benefits/ website/src/app/page.tsx
git commit -m "Add automated water change benefit scene"
```

---

### Task 4: FeedingLogScene + photo asset

**Files:**
- Create: `website/public/img/cosmo.jpg` (resized from `media/Cosmo.jpg`)
- Create: `website/src/components/benefits/FeedingLogScene.tsx`
- Modify: `website/src/components/benefits/benefits.css` (append)
- Modify: `website/src/app/page.tsx` (insert row below ATO row)

**Interfaces:**
- Consumes: `SceneFigure`, `Chip`, `PhoneFrame`, `SceneProps` from `./primitives`.
- Produces: `FeedingLogScene({ variant }: SceneProps)` — one-shot ~4s log-entry sequence.

- [ ] **Step 1: Create the photo asset**

```bash
mkdir -p website/public/img
sips -Z 512 media/Cosmo.jpg --out website/public/img/cosmo.jpg
```

Expected: `website/public/img/cosmo.jpg` exists and is ≤ ~150 KB (check with `ls -la website/public/img/`; if larger, re-run with `-Z 400`).

- [ ] **Step 2: Write `FeedingLogScene.tsx`**

Sequence: tap ripple on "Log feeding" → new entry slides in from the right while the two older entries shift down → the newest bar in the history chart grows.

```tsx
import { SceneFigure, Chip, PhoneFrame, type SceneProps } from './primitives';

const BAR_HEIGHTS = [22, 30, 18, 26, 34];

export function FeedingLogScene({ variant }: SceneProps) {
  return (
    <SceneFigure
      variant={variant}
      label="Feeding log: a feeding is logged on the phone and appears at the top of Cosmo's feeding timeline."
    >
      {/* animal card */}
      <rect x={40} y={70} width={190} height={220} rx={16} className="panel" />
      <clipPath id="feed-photo">
        <circle cx={135} cy={142} r={44} />
      </clipPath>
      <image
        href="/img/cosmo.jpg"
        x={91}
        y={98}
        width={88}
        height={88}
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#feed-photo)"
      />
      <circle cx={135} cy={142} r={44} className="photo-ring" />
      <text x={135} y={218} textAnchor="middle" className="card-name">Cosmo</text>
      <text x={135} y={240} textAnchor="middle" className="card-sub">Fed 12 minutes ago</text>
      {/* phone with feeding timeline */}
      <PhoneFrame x={290} y={40} width={180} height={280}>
        <text x={310} y={76} className="screen-title">Feedings</text>
        <Chip x={310} y={90} width={140} label="Log feeding" tone="lagoon" />
        <circle cx={380} cy={104} r={12} className="feed-ripple" />
        <g className="feed-entry-new">
          <rect x={310} y={136} width={140} height={30} rx={8} className="feed-entry" />
          <text x={318} y={156} className="feed-entry-text">Crickets · Today</text>
        </g>
        <g className="feed-entry-old">
          <rect x={310} y={174} width={140} height={30} rx={8} className="feed-entry" />
          <text x={318} y={194} className="feed-entry-text">Crickets · Tue</text>
        </g>
        <g className="feed-entry-old">
          <rect x={310} y={212} width={140} height={30} rx={8} className="feed-entry" />
          <text x={318} y={232} className="feed-entry-text">Roaches · Sat</text>
        </g>
        {/* weekly history bars, newest last */}
        <g>
          {BAR_HEIGHTS.map((h, i) => (
            <rect
              key={i}
              x={316 + i * 28}
              y={306 - h}
              width={18}
              height={h}
              rx={3}
              className={i === BAR_HEIGHTS.length - 1 ? 'feed-bar feed-bar-new' : 'feed-bar'}
            />
          ))}
        </g>
      </PhoneFrame>
    </SceneFigure>
  );
}
```

- [ ] **Step 3: Append feeding styles to `benefits.css`**

```css
/* ── Feeding log scene ── */
.photo-ring {
  fill: none;
  stroke: var(--lagoon);
  stroke-width: 3;
}
.card-name {
  font: 500 22px var(--font-display);
  fill: var(--ink);
}
.card-sub {
  font: 400 13px var(--font-body);
  fill: var(--ink-soft);
}
.screen-title {
  font: 500 17px var(--font-display);
  fill: var(--ink);
}
.feed-entry {
  fill: var(--paper-sunken);
  stroke: var(--hairline);
  stroke-width: 1;
}
.feed-entry-text {
  font: 500 12px var(--font-body);
  fill: var(--ink);
}
.feed-bar {
  fill: var(--lagoon);
  opacity: 0.45;
}
.feed-bar-new {
  opacity: 1;
  transform-box: fill-box;
  transform-origin: bottom;
  animation: feed-bar 4s ease-out 0.3s both;
}
.feed-ripple {
  fill: var(--lagoon);
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  animation: feed-ripple 4s ease-out 0.3s both;
}
.feed-entry-new {
  animation: feed-new 4s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
}
.feed-entry-old {
  animation: feed-old 4s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
}

@keyframes feed-ripple {
  0%, 8% { opacity: 0; transform: scale(0.3); }
  14% { opacity: 0.45; }
  26%, 100% { opacity: 0; transform: scale(2.2); }
}
@keyframes feed-new {
  0%, 22% { opacity: 0; transform: translateX(28px); }
  38%, 100% { opacity: 1; transform: translateX(0); }
}
@keyframes feed-old {
  0%, 22% { transform: translateY(-38px); }
  38%, 100% { transform: translateY(0); }
}
@keyframes feed-bar {
  0%, 40% { transform: scaleY(0.12); }
  62%, 100% { transform: scaleY(1); }
}
```

- [ ] **Step 4: Insert the row in `page.tsx`**

Add to imports:

```tsx
import { FeedingLogScene } from '@/components/benefits/FeedingLogScene';
```

Insert BELOW the ATO row (row 3, not reversed):

```tsx
            <BenefitRow
              title="Every feeding, remembered."
              body="Log a feeding in two taps and it lands in that animal's timeline — what, how much, when. Appetite changes become a pattern you can see instead of a hunch. Every entry syncs across the wall kiosk and your iPhone."
              scene={<FeedingLogScene />}
            />
```

- [ ] **Step 5: Verify the build**

Run: `cd website && npm run build`
Expected: build succeeds; `out/img/cosmo.jpg` exists after export (`ls website/out/img/`).

- [ ] **Step 6: Visual check**

Checklist (dev server, scroll to row):
- Cosmo's photo renders in the circle (not stretched — `slice` crop).
- Tap ripple → new entry slides in as old entries drop down → last bar grows; no text overflowing chips.
- Row 3 layout: copy left, scene right.

- [ ] **Step 7: Commit**

```bash
git add website/public/img/cosmo.jpg website/src/components/benefits/ website/src/app/page.tsx
git commit -m "Add feeding log benefit scene with Cosmo photo"
```

---

### Task 5: MonitoringScene

**Files:**
- Create: `website/src/components/benefits/MonitoringScene.tsx`
- Modify: `website/src/components/benefits/benefits.css` (append)
- Modify: `website/src/app/page.tsx` (insert row below feeding row, `reverse`)

**Interfaces:**
- Consumes: `SceneFigure`, `TankGlass`, `Chip`, `PulseDot`, `PhoneFrame`, `SceneProps` from `./primitives`.
- Produces: `MonitoringScene({ variant }: SceneProps)` — one-shot ~6s sequence: sparkline draws toward the threshold band, phone alert pops, heater relay dims; live dot pulses forever after.

- [ ] **Step 1: Write `MonitoringScene.tsx`**

```tsx
import { SceneFigure, TankGlass, Chip, PulseDot, PhoneFrame, type SceneProps } from './primitives';

export function MonitoringScene({ variant }: SceneProps) {
  return (
    <SceneFigure
      variant={variant}
      label="Monitoring and alerts: a live temperature chart nears the threshold you set, an alert appears on the phone, and the heater relay switches off."
    >
      {/* tank with probe and heater */}
      <clipPath id="mon-clip">
        <rect x={33} y={122} width={164} height={146} />
      </clipPath>
      <g clipPath="url(#mon-clip)">
        <rect x={33} y={166} width={164} height={102} className="water-fill" />
        <line x1={33} y1={166} x2={197} y2={166} className="water-surface" />
      </g>
      <TankGlass x={30} y={120} width={170} height={150} />
      <path d="M 100 96 V 208" className="probe-wire" />
      <circle cx={100} cy={214} r={7} className="probe-tip" />
      <Chip x={40} y={62} width={96} label="78.2 °F" tone="ink" />
      <g className="mon-heater">
        <rect x={150} y={228} width={14} height={36} rx={4} className="heater-body" />
        <path d="M 153 236 h 8 M 153 245 h 8 M 153 254 h 8" className="heater-coil" />
      </g>
      {/* chart panel with threshold band */}
      <rect x={230} y={60} width={250} height={160} rx={12} className="panel" />
      <rect x={238} y={70} width={234} height={30} className="mon-band" />
      <text x={246} y={90} className="mon-band-label">80 °F max</text>
      <path
        d="M 244 192 L 268 188 L 292 194 L 316 184 L 340 170 L 364 152 L 388 126 L 404 112 L 420 118 L 444 138 L 464 146"
        pathLength={100}
        className="mon-line"
      />
      <PulseDot cx={464} cy={146} r={5} className="mon-live-dot" />
      {/* phone with alert */}
      <PhoneFrame x={300} y={240} width={150} height={110}>
        <Chip x={314} y={256} width={122} label="⚠ Temp high" tone="amber" className="mon-alert" />
        <text x={314} y={310} className="mon-alert-sub">Heater switched off</text>
      </PhoneFrame>
    </SceneFigure>
  );
}
```

- [ ] **Step 2: Append monitoring styles to `benefits.css`**

```css
/* ── Monitoring scene ── */
.probe-wire {
  fill: none;
  stroke: var(--ink);
  stroke-width: 2.5;
  stroke-linecap: round;
}
.probe-tip {
  fill: var(--lagoon);
}
.heater-body {
  fill: var(--paper-sunken);
  stroke: var(--ink);
  stroke-width: 2;
}
.heater-coil {
  stroke: var(--amber);
  stroke-width: 2;
  stroke-linecap: round;
}
.mon-band {
  fill: var(--amber);
  opacity: 0.14;
}
.mon-band-label {
  font: 600 11px var(--font-body);
  fill: var(--amber);
}
.mon-line {
  fill: none;
  stroke: var(--lagoon);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 100;
  animation: mon-draw 6s linear 0.3s both;
}
.mon-live-dot {
  animation: mon-appear 6s ease-out 0.3s both;
}
.mon-alert {
  transform-box: fill-box;
  transform-origin: center;
  animation: mon-alert 6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
}
.mon-alert-sub {
  font: 400 12px var(--font-body);
  fill: var(--ink-soft);
  animation: mon-appear 6s ease-out 0.3s both;
}
.mon-heater {
  animation: mon-heater 6s ease-out 0.3s both;
}

@keyframes mon-draw {
  0% { stroke-dashoffset: 100; }
  60%, 100% { stroke-dashoffset: 0; }
}
@keyframes mon-appear {
  0%, 60% { opacity: 0; }
  70%, 100% { opacity: 1; }
}
@keyframes mon-alert {
  0%, 62% { opacity: 0; transform: scale(0.4); }
  72% { opacity: 1; transform: scale(1.06); }
  78%, 100% { opacity: 1; transform: scale(1); }
}
@keyframes mon-heater {
  0%, 74% { opacity: 1; }
  84%, 100% { opacity: 0.3; }
}
```

- [ ] **Step 3: Insert the row in `page.tsx`**

Add to imports:

```tsx
import { MonitoringScene } from '@/components/benefits/MonitoringScene';
```

Insert BELOW the feeding row (row 4, reversed):

```tsx
            <BenefitRow
              reverse
              title="Know before it's a problem."
              body="Probes stream temperature to the kiosk and your phone in real time, and alerts fire the moment a reading crosses a threshold you set. Everything runs local-first on hardware you own — no subscription required — with optional encrypted backup and remote access on the roadmap."
              scene={<MonitoringScene />}
            />
```

- [ ] **Step 4: Verify the build**

Run: `cd website && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Visual check**

Checklist (dev server, scroll to row):
- Sparkline draws left-to-right, peaks near (not inside) the amber band, settles.
- Alert chip pops with a slight overshoot after the line peaks; "Heater switched off" fades in; heater coil dims.
- Live dot pulses at the end of the line after the draw completes.
- All four rows alternate copy/scene sides correctly (rows 2 and 4 reversed).

- [ ] **Step 6: Commit**

```bash
git add website/src/components/benefits/ website/src/app/page.tsx
git commit -m "Add monitoring and alerts benefit scene"
```

---

### Task 6: Full verification sweep and polish

**Files:**
- Modify (only if checks fail): `website/src/components/benefits/*`, `website/src/app/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: verified, polished section; no new exports.

- [ ] **Step 1: Clean production build**

Run: `cd website && npm run build`
Expected: succeeds; `out/index.html` contains the string `Why ExoPet` (`grep -c "Why ExoPet" website/out/index.html` ≥ 1).

- [ ] **Step 2: Desktop visual sweep**

Dev server, `http://localhost:3000`, default desktop width:
- Each scene animates exactly once triggered by scroll (except ATO, which loops; pulse dots, LED, and shimmer also loop).
- Reload and scroll fast to the section: scenes that enter the viewport together don't visually stutter.
- No SVG text overflows its chip/panel at default font rendering.

- [ ] **Step 3: Mobile width sweep**

Narrow the window to ~375px (or DevTools device toolbar):
- Rows collapse to one column, copy above scene, in all four rows (including reversed ones).
- Scenes remain legible at small width (SVG scales down; text inside SVG scales with it — that's fine).

- [ ] **Step 4: Reduced-motion check**

In Chrome DevTools: Rendering panel → "Emulate CSS media feature prefers-reduced-motion: reduce" (or macOS System Settings → Accessibility → Display → Reduce motion). Reload.
- All four scenes render as static final frames: full tank at target line, result chip visible, feeding entry in place, sparkline fully drawn, alert chip visible, heater dimmed.
- Nothing moves.

- [ ] **Step 5: Weight sanity check**

Run: `ls -la website/out/ && ls -la website/out/img/`
Expected: `cosmo.jpg` is the only new binary asset (≤ ~150 KB); everything else is inline SVG/CSS/JS. No other new images.

Then run a Lighthouse performance audit (Chrome DevTools → Lighthouse → Performance, on the dev or exported site). Expected: performance score within a few points of the pre-change homepage — inline SVG + CSS should not move it meaningfully.

- [ ] **Step 6: Fix anything the sweep caught, re-verify, commit**

Make coordinate/timing adjustments as needed, re-run the failed check, then:

```bash
git add website/
git commit -m "Polish benefit scene layout and timing after verification sweep"
```

(Skip the commit if there was nothing to fix.)
