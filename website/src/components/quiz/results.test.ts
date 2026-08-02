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
