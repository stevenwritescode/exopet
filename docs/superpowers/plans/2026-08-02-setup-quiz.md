# ExoPet Setup Quiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A tap-through setup quiz at `/quiz` on the marketing site that collects visitors' enclosure-setup answers to a form endpoint and rewards them with a personalized "what ExoPet could automate for you" result.

**Architecture:** Static-export Next.js page (`/quiz`) with a `'use client'` wizard component. Questions live in a plain data array; result mapping is a pure function; answers POST as JSON to a `QUIZ_ENDPOINT` constant following the existing `WAITLIST_ENDPOINT` pattern with a mailto fallback.

**Tech Stack:** Next.js 15 (static export, `output: 'export'`), React 19, TypeScript, plain CSS. No new npm dependencies. Node's built-in test runner (`node --test`, type stripping) for the pure result-mapping logic.

**Spec:** `docs/superpowers/specs/2026-07-28-setup-quiz-design.md`

## Global Constraints

- All commands run in `/Users/unknower/Git/exopet/website` unless stated otherwise.
- The default shell node is v16 and cannot run Next 15 or `node --test` with TS. Prefix every node/npm command with `export PATH=/opt/homebrew/opt/node@22/bin:$PATH` (node v22.22.0).
- `npm run build` (static export) must pass after every task — the site has no other CI gate.
- No new npm dependencies. Reuse existing CSS variables (`--lagoon`, `--space-*`, `--radius-*`, `--hairline`, etc.) and classes (`btn`, `btn-primary`, `btn-secondary`, `eyebrow`, `card`, `container`, `section`, `page-title`, `lede`, `form-status`).
- Copy tone matches the site: plain, warm, no exclamation marks.
- The layout (`src/app/layout.tsx`) already wraps pages with `<Header />` and `<Footer />`; pages render only `<main>`.

---

### Task 1: Quiz data model and result mapping

**Files:**
- Modify: `website/tsconfig.json` (add `allowImportingTsExtensions`)
- Create: `website/src/components/quiz/questions.ts`
- Create: `website/src/components/quiz/results.ts`
- Test: `website/src/components/quiz/results.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `questions.ts`: `type QuizAnswers = { enclosure: string; animals: string; water_infrastructure: string[]; control: string[]; monitor: string[]; alerts: string; pain_point: string; buy_or_build: string }`, `type Question = { key: keyof QuizAnswers; prompt: string; multi: boolean; options: { value: string; label: string }[] }`, `const QUESTIONS: Question[]` (length 8, order: enclosure, animals, water_infrastructure, control, monitor, alerts, pain_point, buy_or_build)
  - `results.ts`: `type QuizResult = { bullets: string[]; cta: 'kit' | 'guide' | 'both' }`, `function buildResult(answers: QuizAnswers): QuizResult` (3–5 bullets, pain-point bullet first when present)

- [ ] **Step 1: Allow `.ts` extension imports (needed so the test file can run under `node --test` type stripping and still pass Next's typecheck)**

In `website/tsconfig.json`, add to `compilerOptions` (alongside `"noEmit": true`):

```json
    "allowImportingTsExtensions": true,
```

- [ ] **Step 2: Create the question data**

Create `website/src/components/quiz/questions.ts`:

```ts
export type QuizAnswers = {
  enclosure: string;
  animals: string;
  water_infrastructure: string[];
  control: string[];
  monitor: string[];
  alerts: string;
  pain_point: string;
  buy_or_build: string;
};

export type Question = {
  key: keyof QuizAnswers;
  prompt: string;
  multi: boolean;
  options: { value: string; label: string }[];
};

export const QUESTIONS: Question[] = [
  {
    key: 'enclosure',
    prompt: 'What kind of enclosure do you keep?',
    multi: false,
    options: [
      { value: 'freshwater', label: 'Freshwater aquarium' },
      { value: 'saltwater', label: 'Saltwater aquarium' },
      { value: 'paludarium', label: 'Paludarium or vivarium' },
      { value: 'terrarium', label: 'Terrarium (reptile or amphibian)' },
      { value: 'multiple', label: 'Multiple, or something else' },
    ],
  },
  {
    key: 'animals',
    prompt: 'Who lives there?',
    multi: false,
    options: [
      { value: 'fish', label: 'Fish' },
      { value: 'amphibian', label: 'Axolotl or other amphibian' },
      { value: 'reptile', label: 'Reptile' },
      { value: 'invertebrates', label: 'Invertebrates' },
      { value: 'plants', label: 'Plants, mostly' },
      { value: 'mix', label: 'A mix' },
    ],
  },
  {
    key: 'water_infrastructure',
    prompt: 'What water infrastructure do you have?',
    multi: true,
    options: [
      { value: 'sump', label: 'A sump' },
      { value: 'reservoir', label: 'A reservoir or top-off container' },
      { value: 'drain', label: 'Drain access nearby' },
      { value: 'none', label: 'None of these' },
    ],
  },
  {
    key: 'control',
    prompt: 'What equipment would you want ExoPet to control?',
    multi: true,
    options: [
      { value: 'return_pump', label: 'Return or circulation pump' },
      { value: 'dosing_pump', label: 'Dosing pump' },
      { value: 'valves', label: 'Solenoid or motorized valves' },
      { value: 'heater', label: 'Heater' },
      { value: 'lights', label: 'Lights' },
      { value: 'mister', label: 'Mister or fogger' },
      { value: 'feeder', label: 'Auto feeder' },
      { value: 'none', label: 'Nothing yet, just curious' },
    ],
  },
  {
    key: 'monitor',
    prompt: 'What would you want monitored?',
    multi: true,
    options: [
      { value: 'temperature', label: 'Temperature' },
      { value: 'ph', label: 'pH' },
      { value: 'water_level', label: 'Water level' },
      { value: 'humidity', label: 'Humidity' },
      { value: 'salinity', label: 'Salinity or TDS' },
      { value: 'leak', label: 'Leak detection' },
    ],
  },
  {
    key: 'alerts',
    prompt: 'How should ExoPet get your attention?',
    multi: false,
    options: [
      { value: 'all', label: 'Notify me about anything off' },
      { value: 'critical_only', label: 'Only emergencies — leaks, temp spikes' },
      { value: 'none', label: 'I would just check a dashboard' },
    ],
  },
  {
    key: 'pain_point',
    prompt: 'What is the maintenance chore you would most like to lose?',
    multi: false,
    options: [
      { value: 'water_changes', label: 'Water changes' },
      { value: 'top_offs', label: 'Top-offs' },
      { value: 'dosing', label: 'Dosing' },
      { value: 'feeding', label: 'Feeding' },
      { value: 'misting', label: 'Misting and humidity' },
      { value: 'cleaning', label: 'Cleaning' },
      { value: 'remembering', label: 'Remembering what I did last' },
    ],
  },
  {
    key: 'buy_or_build',
    prompt: 'If ExoPet fits your setup, would you rather…',
    multi: false,
    options: [
      { value: 'kit', label: 'Buy a ready-made kit' },
      { value: 'diy', label: 'Build it myself from a guide' },
      { value: 'exploring', label: 'Just exploring for now' },
    ],
  },
];
```

- [ ] **Step 3: Write the failing test for `buildResult`**

Create `website/src/components/quiz/results.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildResult } from './results.ts';
import type { QuizAnswers } from './questions.ts';

const reefKeeper: QuizAnswers = {
  enclosure: 'saltwater',
  animals: 'fish',
  water_infrastructure: ['sump', 'reservoir'],
  control: ['return_pump', 'dosing_pump'],
  monitor: ['temperature', 'ph'],
  alerts: 'critical_only',
  pain_point: 'water_changes',
  buy_or_build: 'kit',
};

test('reef keeper: pain point leads, picks are named, cta is kit', () => {
  const r = buildResult(reefKeeper);
  assert.ok(r.bullets.length >= 3 && r.bullets.length <= 5);
  assert.match(r.bullets[0], /water change/i);
  assert.ok(r.bullets.some((b) => /top.?off/i.test(b)));
  assert.ok(r.bullets.some((b) => /dosing/i.test(b)));
  assert.ok(r.bullets.some((b) => b.includes('temperature') && b.includes('pH')));
  assert.ok(r.bullets.some((b) => /emergenc/i.test(b)));
  assert.equal(r.cta, 'kit');
});

test('empty terrarium browser still gets 3 bullets and both CTAs', () => {
  const r = buildResult({
    enclosure: 'terrarium',
    animals: 'reptile',
    water_infrastructure: ['none'],
    control: ['none'],
    monitor: [],
    alerts: 'none',
    pain_point: 'cleaning',
    buy_or_build: 'exploring',
  });
  assert.ok(r.bullets.length >= 3 && r.bullets.length <= 5);
  assert.equal(r.cta, 'both');
});

test('mister implies humidity automation; diy maps to guide', () => {
  const r = buildResult({
    enclosure: 'paludarium',
    animals: 'amphibian',
    water_infrastructure: ['reservoir'],
    control: ['mister'],
    monitor: ['humidity'],
    alerts: 'all',
    pain_point: 'misting',
    buy_or_build: 'diy',
  });
  assert.match(r.bullets[0], /humidity|mist/i);
  assert.equal(r.cta, 'guide');
});

test('never more than 5 bullets even when everything is selected', () => {
  const r = buildResult({
    enclosure: 'multiple',
    animals: 'mix',
    water_infrastructure: ['sump', 'reservoir', 'drain'],
    control: ['return_pump', 'dosing_pump', 'valves', 'heater', 'lights', 'mister', 'feeder'],
    monitor: ['temperature', 'ph', 'water_level', 'humidity', 'salinity', 'leak'],
    alerts: 'all',
    pain_point: 'feeding',
    buy_or_build: 'kit',
  });
  assert.ok(r.bullets.length <= 5);
  assert.match(r.bullets[0], /feed/i);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run:
```bash
cd /Users/unknower/Git/exopet/website
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
node --test src/components/quiz/results.test.ts
```
Expected: FAIL — cannot find module `./results.ts`.

- [ ] **Step 5: Implement `buildResult`**

Create `website/src/components/quiz/results.ts`:

```ts
import type { QuizAnswers } from './questions.ts';

export type QuizResult = {
  bullets: string[];
  cta: 'kit' | 'guide' | 'both';
};

const MONITOR_LABELS: Record<string, string> = {
  temperature: 'temperature',
  ph: 'pH',
  water_level: 'water level',
  humidity: 'humidity',
  salinity: 'salinity',
  leak: 'leaks',
};

// Which feature bullet answers each pain point, so it can lead the list.
const PAIN_TO_FEATURE: Record<string, string> = {
  water_changes: 'water_changes',
  top_offs: 'top_off',
  dosing: 'dosing',
  feeding: 'feeding',
  misting: 'humidity',
  remembering: 'logging',
};

export function buildResult(a: QuizAnswers): QuizResult {
  // Keyed candidates, in default priority order.
  const features: [string, string][] = [];

  if (a.water_infrastructure.includes('sump') || a.water_infrastructure.includes('drain')) {
    features.push([
      'water_changes',
      'Hands-free water changes on a schedule — drain, refill, and log, no buckets.',
    ]);
  }
  if (a.water_infrastructure.includes('reservoir')) {
    features.push([
      'top_off',
      'Automatic top-offs from your reservoir the moment the level dips.',
    ]);
  }
  if (a.control.includes('dosing_pump')) {
    features.push(['dosing', 'Scheduled dosing, measured and logged every time.']);
  }
  if (a.control.includes('mister') || a.monitor.includes('humidity')) {
    features.push([
      'humidity',
      'Humidity on autopilot — misting cycles that react to the actual reading.',
    ]);
  }
  if (a.control.includes('feeder')) {
    features.push([
      'feeding',
      'Auto-feeder schedules, with every feeding landing in the log.',
    ]);
  }
  if (a.monitor.length > 0) {
    const names = a.monitor.map((m) => MONITOR_LABELS[m] ?? m).join(', ');
    features.push([
      'monitoring',
      `Continuous monitoring of ${names}, streamed to the kiosk and your phone.`,
    ]);
  }
  if (a.alerts === 'all') {
    features.push(['alerts', 'Alerts the moment anything drifts from where you set it.']);
  } else if (a.alerts === 'critical_only') {
    features.push([
      'alerts',
      'Quiet by default — alerts only for emergencies like leaks or temperature spikes.',
    ]);
  } else {
    features.push([
      'alerts',
      'A live dashboard you can check anytime — no nagging notifications.',
    ]);
  }
  features.push([
    'logging',
    'Every action logged automatically, so you never wonder what you did last.',
  ]);

  // Lead with the bullet that answers their pain point, when we have one.
  const painKey = PAIN_TO_FEATURE[a.pain_point];
  const ordered = painKey
    ? [
        ...features.filter(([k]) => k === painKey),
        ...features.filter(([k]) => k !== painKey),
      ]
    : features;

  let bullets = ordered.map(([, text]) => text).slice(0, 5);

  const fillers = [
    'Local-first control from a wall-mounted touchscreen and your iPhone.',
    'An open-source hub you can read, change, and extend.',
  ];
  for (const filler of fillers) {
    if (bullets.length >= 3) break;
    bullets.push(filler);
  }

  const cta = a.buy_or_build === 'kit' ? 'kit' : a.buy_or_build === 'diy' ? 'guide' : 'both';
  return { bullets, cta };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run:
```bash
cd /Users/unknower/Git/exopet/website
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
node --test src/components/quiz/results.test.ts
```
Expected: 4 passing tests.

- [ ] **Step 7: Verify the site still typechecks/builds**

Run:
```bash
cd /Users/unknower/Git/exopet/website
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
npm run build
```
Expected: build succeeds (test file and new modules typecheck; nothing imports them yet).

- [ ] **Step 8: Commit**

```bash
cd /Users/unknower/Git/exopet
git add website/tsconfig.json website/src/components/quiz/
git commit -m "Add quiz question data and result mapping with tests"
```

---

### Task 2: Quiz wizard component and /quiz page

**Files:**
- Modify: `website/src/data/site.ts` (add `QUIZ_ENDPOINT`)
- Create: `website/src/components/quiz/Quiz.tsx`
- Create: `website/src/components/quiz/quiz.css`
- Create: `website/src/app/quiz/page.tsx`

**Interfaces:**
- Consumes: `QUESTIONS`, `Question`, `QuizAnswers` from `./questions` and `buildResult`, `QuizResult` from `./results` (Task 1); `WaitlistForm` (`kitName: string` prop) and `CONTACT_EMAIL` from existing code.
- Produces: `QUIZ_ENDPOINT: string` in `@/data/site`; default-exported `Quiz` client component (no props); page route `/quiz`.

- [ ] **Step 1: Add the endpoint constant**

In `website/src/data/site.ts`, after the `WAITLIST_ENDPOINT` block, add:

```ts
// Same pattern as WAITLIST_ENDPOINT: set to a form service endpoint to
// collect setup-quiz responses. While empty, responses are not submitted
// and the result screen offers a mailto fallback instead.
export const QUIZ_ENDPOINT = '';
```

- [ ] **Step 2: Write the wizard component**

Create `website/src/components/quiz/Quiz.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import WaitlistForm from '@/components/WaitlistForm';
import { CONTACT_EMAIL, QUIZ_ENDPOINT } from '@/data/site';
import { QUESTIONS } from './questions';
import type { QuizAnswers } from './questions';
import { buildResult } from './results';
import './quiz.css';

type MultiKey = 'water_infrastructure' | 'control' | 'monitor';
type SubmitState = 'idle' | 'sent' | 'failed';

const EMPTY: QuizAnswers = {
  enclosure: '',
  animals: '',
  water_infrastructure: [],
  control: [],
  monitor: [],
  alerts: '',
  pain_point: '',
  buy_or_build: '',
};

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  const done = step >= QUESTIONS.length;
  const question = done ? null : QUESTIONS[step];

  function finish(finalAnswers: QuizAnswers) {
    setAnswers(finalAnswers);
    setStep(QUESTIONS.length);
    if (!QUIZ_ENDPOINT) return;
    fetch(QUIZ_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(finalAnswers),
    })
      .then((res) => setSubmitState(res.ok ? 'sent' : 'failed'))
      .catch(() => setSubmitState('failed'));
  }

  function selectSingle(value: string) {
    if (!question) return;
    const next = { ...answers, [question.key]: value };
    if (step === QUESTIONS.length - 1) {
      finish(next);
    } else {
      setAnswers(next);
      setStep(step + 1);
    }
  }

  function toggleMulti(value: string) {
    if (!question) return;
    const key = question.key as MultiKey;
    const current = answers[key];
    let next: string[];
    if (value === 'none') {
      // "None" is exclusive of every other choice.
      next = current.includes('none') ? [] : ['none'];
    } else if (current.includes(value)) {
      next = current.filter((v) => v !== value);
    } else {
      next = [...current.filter((v) => v !== 'none'), value];
    }
    setAnswers({ ...answers, [key]: next });
  }

  if (done) {
    const result = buildResult(answers);
    const mailtoNeeded = !QUIZ_ENDPOINT || submitState === 'failed';
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      'My ExoPet setup quiz answers'
    )}&body=${encodeURIComponent(JSON.stringify(answers, null, 2))}`;
    return (
      <div className="quiz-card quiz-result">
        <span className="eyebrow">Your ExoPet setup</span>
        <h2>Here&rsquo;s what ExoPet could take off your plate.</h2>
        <ul>
          {result.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        {(result.cta === 'kit' || result.cta === 'both') && (
          <div className="quiz-cta">
            <p>
              Kits are in development — pre-flashed, pre-wired, ready to go.
              Want one for this setup?
            </p>
            <WaitlistForm kitName="ExoPet kit (setup quiz)" />
          </div>
        )}
        {(result.cta === 'guide' || result.cta === 'both') && (
          <div className="quiz-cta">
            <p>Two Raspberry Pis and an afternoon gets you there today.</p>
            <Link href="/guide" className="btn btn-secondary">
              Read the build guide
            </Link>
          </div>
        )}
        {mailtoNeeded && (
          <p className="quiz-fallback">
            Want to make sure your setup reaches us?{' '}
            <a href={mailto}>Email us your answers</a> — it helps us build the
            right hub.
          </p>
        )}
      </div>
    );
  }

  const q = question!;
  const selected = answers[q.key];
  return (
    <div className="quiz-card">
      <p className="quiz-progress">
        Question {step + 1} of {QUESTIONS.length}
      </p>
      <h2 className="quiz-prompt">{q.prompt}</h2>
      {q.multi && <p className="quiz-hint">Choose all that apply.</p>}
      <div className="quiz-options">
        {q.options.map((opt) => {
          const isSelected = q.multi
            ? (selected as string[]).includes(opt.value)
            : selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              className={`quiz-option${isSelected ? ' selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() =>
                q.multi ? toggleMulti(opt.value) : selectSingle(opt.value)
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="quiz-nav">
        {step > 0 ? (
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
        ) : (
          <span />
        )}
        {q.multi && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setStep(step + 1)}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
```

Note: the last question (`buy_or_build`) is single-select, so `finish()` always
fires from `selectSingle` — multi-select `Next` never needs to finish the quiz.
If the question order ever changes so a multi question is last, the `Next`
handler must call `finish` too; keep `buy_or_build` last.

- [ ] **Step 3: Write the styles**

Create `website/src/components/quiz/quiz.css`:

```css
.quiz-card {
  max-width: 40rem;
  margin: 0 auto;
  background: var(--paper-raised);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}

.quiz-progress {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--ink-faint);
  margin-bottom: var(--space-2);
}

.quiz-prompt {
  font-family: var(--font-display);
  font-size: 1.5rem;
  margin-bottom: var(--space-2);
}

.quiz-hint {
  color: var(--ink-soft);
  font-size: 0.9rem;
  margin-bottom: var(--space-2);
}

.quiz-options {
  display: grid;
  gap: var(--space-2);
  margin: var(--space-4) 0;
}

.quiz-option {
  text-align: left;
  font: inherit;
  padding: var(--space-3) var(--space-4);
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.quiz-option:hover {
  border-color: var(--lagoon);
}

.quiz-option.selected {
  background: var(--lagoon-tint);
  border-color: var(--lagoon);
  color: var(--lagoon-deep);
}

.quiz-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 2.5rem;
}

.quiz-result h2 {
  font-family: var(--font-display);
  font-size: 1.6rem;
  margin: var(--space-2) 0 var(--space-3);
}

.quiz-result ul {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-4);
}

.quiz-result li {
  padding: var(--space-2) 0 var(--space-2) 1.6rem;
  position: relative;
}

.quiz-result li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--lagoon);
}

.quiz-cta {
  border-top: 1px solid var(--hairline);
  padding-top: var(--space-3);
  margin-top: var(--space-3);
}

.quiz-cta p {
  color: var(--ink-soft);
  margin-bottom: var(--space-3);
}

.quiz-fallback {
  margin-top: var(--space-4);
  font-size: 0.9rem;
  color: var(--ink-soft);
}
```

- [ ] **Step 4: Create the page**

Create `website/src/app/quiz/page.tsx`:

```tsx
import type { Metadata } from 'next';
import Quiz from '@/components/quiz/Quiz';

export const metadata: Metadata = {
  title: 'Setup Quiz — ExoPet',
  description:
    'Answer eight quick questions about your enclosure and see what ExoPet could automate for you.',
};

export default function QuizPage() {
  return (
    <main className="container section">
      <span className="eyebrow">Setup quiz</span>
      <h1 className="page-title">What could ExoPet do for your enclosure?</h1>
      <p className="lede">
        Eight quick questions — about two minutes. Your answers also help us
        decide what the hub should do next.
      </p>
      <div style={{ marginTop: 'var(--space-5)' }}>
        <Quiz />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Build and smoke-test the page**

Run:
```bash
cd /Users/unknower/Git/exopet/website
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
npm run build
ls out/quiz.html
```
Expected: build succeeds and `out/quiz.html` exists (the export uses flat
`.html` files — compare `out/shop.html`).

- [ ] **Step 6: Commit**

```bash
cd /Users/unknower/Git/exopet
git add website/src/data/site.ts website/src/components/quiz/ website/src/app/quiz/
git commit -m "Add /quiz setup wizard with personalized result screen"
```

---

### Task 3: Homepage and header links to the quiz

**Files:**
- Modify: `website/src/components/Header.tsx` (add nav link)
- Modify: `website/src/app/page.tsx` (add CTA section)

**Interfaces:**
- Consumes: `/quiz` route (Task 2)
- Produces: nothing downstream

- [ ] **Step 1: Add the header nav link**

In `website/src/components/Header.tsx`, add a `Quiz` link before the Build Guide link:

```tsx
        <nav className="site-nav">
          <Link href="/quiz">Quiz</Link>
          <Link href="/guide">Build Guide</Link>
          <Link href="/downloads">Downloads</Link>
          <Link href="/shop" className="btn btn-primary btn-small">
            Get the Kit
          </Link>
        </nav>
```

- [ ] **Step 2: Add the homepage CTA section**

In `website/src/app/page.tsx`, directly after the closing tag of the `id="why"` section and before the "Three ways in" section, insert:

```tsx
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="card" style={{ textAlign: 'center' }}>
            <span className="eyebrow">Two minutes</span>
            <h2 className="page-title" style={{ fontSize: '1.75rem' }}>
              What could ExoPet automate for you?
            </h2>
            <p className="lede" style={{ margin: '0 auto var(--space-4)' }}>
              Tell us about your enclosure — eight quick questions — and
              we&rsquo;ll show you what the hub could take off your plate.
            </p>
            <Link href="/quiz" className="btn btn-primary">
              Take the setup quiz
            </Link>
          </div>
        </div>
      </section>
```

- [ ] **Step 3: Build**

Run:
```bash
cd /Users/unknower/Git/exopet/website
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/unknower/Git/exopet
git add website/src/components/Header.tsx website/src/app/page.tsx
git commit -m "Link setup quiz from homepage and header"
```

---

### Task 4: End-to-end walkthrough with POST verification

**Files:**
- Create: `/tmp/quiz-e2e.py` (throwaway test script, not committed)
- Modify (temporarily, reverted): `website/src/data/site.ts`

**Interfaces:**
- Consumes: the complete quiz (Tasks 1–3)
- Produces: verified feature; no code artifacts

- [ ] **Step 1: Point QUIZ_ENDPOINT at a test URL (temporary)**

```bash
cd /Users/unknower/Git/exopet/website
sed -i '' "s|export const QUIZ_ENDPOINT = '';|export const QUIZ_ENDPOINT = 'https://quiz-e2e.invalid/submit';|" src/data/site.ts
```

- [ ] **Step 2: Start the dev server**

```bash
cd /Users/unknower/Git/exopet/website
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
npm run dev -- --port 3100
```
Run in the background; wait until `curl -s http://localhost:3100/quiz` returns HTML.

- [ ] **Step 3: Write and run the walkthrough script**

Create `/tmp/quiz-e2e.py`:

```python
import json
from playwright.sync_api import sync_playwright

captured = {}

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 800, "height": 900})

    def handle(route):
        captured["payload"] = json.loads(route.request.post_data)
        route.fulfill(status=200, body="{}")

    page.route("https://quiz-e2e.invalid/**", handle)
    page.goto("http://localhost:3100/quiz", wait_until="load")

    page.click("text=Saltwater aquarium")            # Q1 single -> auto-advance
    page.click("text=Fish")                          # Q2
    page.click("text=A sump")                        # Q3 multi
    page.click("text=A reservoir or top-off container")
    page.click("button:has-text('Next')")
    page.click("text=Dosing pump")                   # Q4 multi
    page.click("button:has-text('Next')")
    page.click("text=Temperature")                   # Q5 multi
    page.click("text=pH")
    page.click("button:has-text('Next')")
    page.click("text=Only emergencies — leaks, temp spikes")  # Q6
    page.click("text=Water changes")                 # Q7
    page.click("text=Buy a ready-made kit")          # Q8 -> finish + POST

    page.wait_for_selector("text=Here’s what ExoPet could take off your plate.")
    body = page.evaluate("() => document.body.innerText")

    assert "payload" in captured, "quiz POST never fired"
    pl = captured["payload"]
    assert pl == {
        "enclosure": "saltwater",
        "animals": "fish",
        "water_infrastructure": ["sump", "reservoir"],
        "control": ["dosing_pump"],
        "monitor": ["temperature", "ph"],
        "alerts": "critical_only",
        "pain_point": "water_changes",
        "buy_or_build": "kit",
    }, f"unexpected payload: {pl}"
    assert "water change" in body.lower(), "pain-point bullet missing"
    assert "temperature" in body and "pH" in body, "monitoring bullet missing"
    assert "waitlist" in body.lower(), "kit CTA (WaitlistForm) missing"

    # Back button: reload and check navigation works
    page.goto("http://localhost:3100/quiz", wait_until="load")
    page.click("text=Freshwater aquarium")
    page.click("button:has-text('Back')")
    assert "Question 1 of 8" in page.evaluate("() => document.body.innerText")

    print("E2E PASS")
    print(json.dumps(captured["payload"], indent=2))
    browser.close()
```

Run: `python3 /tmp/quiz-e2e.py`
Expected: `E2E PASS` and the payload printed with all eight keys.

- [ ] **Step 4: Revert the endpoint and stop the dev server**

```bash
cd /Users/unknower/Git/exopet/website
sed -i '' "s|export const QUIZ_ENDPOINT = 'https://quiz-e2e.invalid/submit';|export const QUIZ_ENDPOINT = '';|" src/data/site.ts
git diff --exit-code src/data/site.ts
```
Expected: no diff. Kill the dev server process.

- [ ] **Step 5: Final full build and unit tests**

```bash
cd /Users/unknower/Git/exopet/website
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
node --test src/components/quiz/results.test.ts && npm run build
```
Expected: tests pass, build succeeds. Nothing to commit unless fixes were
needed; if fixes were made, commit them with a message describing the fix.
