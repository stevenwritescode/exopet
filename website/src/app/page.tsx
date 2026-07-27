import Link from 'next/link';
import { BenefitRow } from '@/components/benefits/BenefitRow';
import { WaterChangeScene } from '@/components/benefits/WaterChangeScene';
import { AtoScene } from '@/components/benefits/AtoScene';
import '@/components/benefits/benefits.css';

const features = [
  {
    title: 'Scheduled water changes',
    body: 'Drain, refill, and top off on a schedule. Anti-siphon valves and fail-closed solenoids keep the water where it belongs.',
  },
  {
    title: 'Pump & valve control',
    body: 'Eight relay channels drive dosing pumps, return pumps, solenoid valves, misters — anything that switches.',
  },
  {
    title: 'Temperature monitoring',
    body: 'Waterproof probes log conditions continuously, so drift gets caught before your animals notice.',
  },
  {
    title: 'Touchscreen + iOS control',
    body: 'A wall-mounted touchscreen at the enclosure, and an iPhone app from the couch. Both find the hub automatically.',
  },
  {
    title: 'Local-first, no cloud',
    body: 'Everything runs on your network, on hardware you own. No accounts, no subscription, no one else’s server.',
  },
  {
    title: 'Open source',
    body: 'The hub, the UI, and the app are all open. Read the code, change it, and make it fit your setup.',
  },
];

const pathways = [
  {
    href: '/guide',
    title: 'Build it yourself',
    body: 'Follow the step-by-step guide: two Raspberry Pis, a relay board, and an afternoon of honest tinkering.',
    cta: 'Read the build guide',
  },
  {
    href: '/downloads',
    title: 'Print the parts',
    body: 'Free STLs for the hub case, touchscreen stand, sensor holders, and mounting brackets.',
    cta: 'Browse the STLs',
  },
  {
    href: '/shop',
    title: 'Get the kit',
    body: 'Pre-flashed, pre-wired, ready-to-go kits are coming. Join the waitlist to be first in line.',
    cta: 'Join the waitlist',
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <h1 className="reveal reveal-1">
            Automate <em>any</em> habitat.
          </h1>
          <p className="lede reveal reveal-2">
            ExoPet is an open-source life-support controller for aquariums,
            terrariums, and vivariums. It changes the water, doses, monitors,
            and alerts — from a Raspberry Pi you build yourself.
          </p>
          <div className="hero-ctas reveal reveal-3">
            <Link href="/guide" className="btn btn-primary">
              Build your own
            </Link>
            <Link href="/shop" className="btn btn-secondary">
              Get the kit
            </Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <span className="eyebrow">What it does</span>
          <h2 className="page-title" style={{ fontSize: '2.25rem' }}>
            Your enclosure, on autopilot.
          </h2>
          <div className="grid-3" style={{ marginTop: 'var(--space-5)' }}>
            {features.map((f) => (
              <div key={f.title} className="feature">
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="why" style={{ paddingTop: 0 }}>
        <div className="container">
          <span className="eyebrow">Why ExoPet</span>
          <h2 className="page-title" style={{ fontSize: '2.25rem' }}>
            The chores disappear. The animals notice.
          </h2>
          <div style={{ marginTop: 'var(--space-6)' }}>
            <BenefitRow
              title="Water changes while you sleep."
              body="Schedule a change for 3 AM on Sunday and ExoPet does the rest — drain, refill, log it. Fail-closed solenoids and anti-siphon plumbing mean a power cut leaves the water exactly where it belongs. No buckets, no hoses, no lost weekend."
              scene={<WaterChangeScene />}
            />
            <BenefitRow
              reverse
              title="Evaporation, handled."
              body="Water evaporates around the clock, and level and salinity drift with it. A float switch catches the dip, a dosing pump eases the level back to the line, and a run-timeout failsafe makes sure a stuck switch can never flood the room."
              scene={<AtoScene />}
            />
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <span className="eyebrow">Three ways in</span>
          <div className="grid-3" style={{ marginTop: 'var(--space-4)' }}>
            {pathways.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="card card-hover"
                style={{ color: 'inherit', display: 'block' }}
              >
                <h3 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-3)' }}>
                  {p.title}
                </h3>
                <p style={{ color: 'var(--ink-soft)', marginBottom: 'var(--space-4)' }}>
                  {p.body}
                </p>
                <span style={{ fontWeight: 600, color: 'var(--lagoon)' }}>
                  {p.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
