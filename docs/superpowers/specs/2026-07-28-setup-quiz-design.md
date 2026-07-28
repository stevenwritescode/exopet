# ExoPet Setup Quiz — Design

**Date:** 2026-07-28
**Status:** Approved

## Purpose

A short, shareable quiz on the marketing website that collects information about
visitors' enclosure setups — what they keep, what hardware they run, and what
they'd want automated or monitored — to gauge what people need from an ExoPet
hub product. In exchange, the respondent gets a personalized "here's what ExoPet
could automate for you" result, which doubles as a marketing hook and feeds the
kit waitlist.

## Approach

Tap-through wizard: one question per screen with a progress indicator, big
tappable options, and a computed result screen at the end. Built in-house on the
existing static-export Next.js site (no third-party form embed), reusing the
site's established form-endpoint pattern.

## Placement

- New static page at `/quiz`.
- Linked from the homepage via a small CTA section ("What could ExoPet automate
  for you? Take the 2-minute setup quiz") and from the header nav.
- The URL is shareable for posting on forums/social.

## Questions

Eight questions, one per screen, ~2 minutes total. Defined as a plain data
array so future survey edits are data changes, not UI changes.

1. **Enclosure type** (single): Freshwater aquarium / Saltwater aquarium /
   Paludarium–vivarium / Terrarium (reptile or amphibian) / Multiple or
   something else
2. **Who lives there** (single): Fish / Axolotl or other amphibian / Reptile /
   Invertebrates / Plants mostly / A mix
3. **Water infrastructure** (multi-select): Sump / Reservoir or top-off
   container / Drain access nearby / None of these
4. **Equipment you'd want controlled** (multi-select): Return or circulation
   pump / Dosing pump / Solenoid or motorized valves / Heater / Lights /
   Mister or fogger / Auto feeder / Nothing yet, just curious
5. **What you'd want monitored** (multi-select): Temperature / pH / Water
   level / Humidity / Salinity or TDS / Leak detection
6. **Alerts** (single): Yes, notify me about anything off / Only emergencies
   (leak, temp spike) / No, I'd just check a dashboard
7. **Biggest maintenance pain** (single): Water changes / Top-offs / Dosing /
   Feeding / Misting & humidity / Cleaning / Remembering what I did last
8. **Would you rather** (single): Buy a ready-made kit / Build it myself from a
   guide / Just exploring

Multi-select questions have an explicit "Next" button; single-select advances
on tap. A back control lets respondents change earlier answers.

## Result screen

Computed client-side from the answers: a short "Your ExoPet setup" summary
listing 3–5 concrete things the hub could do for their enclosure. Mapping
rules:

- Reservoir/top-off container → automatic top-offs
- Sump and/or drain access → hands-free scheduled water changes
- Dosing pump → scheduled dosing
- Mister/fogger (or humidity monitoring) → humidity automation
- Monitoring selections → continuous monitoring bullet naming their picks
- Alerts answer → alert bullet phrased to match their preference
- Q7 pain point → lead the summary with the matching automation when possible

Below the summary, one CTA matched to Q8:

- **Buy a kit** → reuse the existing `WaitlistForm` component
- **Build it myself** → link to `/guide`
- **Just exploring** → both, low-key

## Data collection

- New `QUIZ_ENDPOINT` constant in `src/data/site.ts`, same pattern as
  `WAITLIST_ENDPOINT` (Formspree-style JSON POST).
- Answers POST as JSON to `QUIZ_ENDPOINT` immediately when the last question
  is answered, before the result screen renders — so drop-off on the result
  screen never loses the response. The quiz payload contains no email; email
  capture happens separately through the `WaitlistForm` CTA on the result
  screen (its existing waitlist endpoint), and seeing the result is never
  gated on it.
- While `QUIZ_ENDPOINT` is unset: the quiz runs and shows the result; no
  submission is made. The result screen includes a small "email us your setup"
  mailto link (prefilled with their answers) as the fallback so responses are
  never lost, matching the waitlist form's philosophy.
- Submission failures never block the result screen; on error, show the mailto
  fallback inline.

### Payload shape

```json
{
  "enclosure": "freshwater",
  "animals": "amphibian",
  "water_infrastructure": ["sump", "reservoir"],
  "control": ["return_pump", "dosing_pump"],
  "monitor": ["temperature", "ph"],
  "alerts": "critical_only",
  "pain_point": "water_changes",
  "buy_or_build": "kit"
}
```

## Structure

- `website/src/app/quiz/page.tsx` — metadata + page shell (server component)
- `website/src/components/quiz/Quiz.tsx` — `'use client'` wizard: state,
  navigation, submission, result rendering
- `website/src/components/quiz/questions.ts` — question/option data array and
  answer types
- `website/src/components/quiz/results.ts` — pure result-mapping logic
  (answers → summary bullets + CTA choice), kept separate so it is testable
- `website/src/components/quiz/quiz.css` — styling, reusing the site's CSS
  variables and button classes
- `website/src/data/site.ts` — add `QUIZ_ENDPOINT`

Homepage and `Header.tsx` get the links to `/quiz`.

## Error handling

- POST wrapped in try/catch; failures show the mailto fallback and never block
  the result.
- Refresh mid-quiz restarts it (no persistence — acceptable for a 2-minute
  quiz).
- Direct navigation to `/quiz` always starts at question 1.

## Verification

- `npm run build` in `website/` must pass (static export).
- Headless-browser walkthrough: complete the quiz end-to-end, confirm the
  result screen matches the chosen answers, and confirm the POST fires with the
  expected JSON shape (against a mock endpoint).
- Result-mapping logic exercised directly with representative answer
  combinations (pure function, no framework test harness required — the site
  has none).
