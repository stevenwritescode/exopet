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
