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
