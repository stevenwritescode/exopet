import Link from 'next/link';
import type { Metadata } from 'next';
import StepCard from '@/components/StepCard';
import { walkthroughs, walkthroughBySlug } from '@/data/guide';

export function generateStaticParams() {
  return walkthroughs.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const w = walkthroughBySlug(slug);
  return {
    title: `${w.title} — ExoPet`,
    description: w.intro,
  };
}

export default async function WalkthroughPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const walkthrough = walkthroughBySlug(slug);
  const other = walkthroughs.find((w) => w.slug !== slug)!;

  return (
    <main className="container section">
      <span className="eyebrow">
        <Link href="/guide">Build guide</Link> · Part{' '}
        {walkthroughs.indexOf(walkthrough) + 1}
      </span>
      <h1 className="page-title">{walkthrough.title}</h1>
      <p className="lede">{walkthrough.intro}</p>
      <div className="badge-row">
        <span className="badge">{walkthrough.duration}</span>
        <span className="badge">{walkthrough.difficulty}</span>
        <span className="badge">{walkthrough.steps.length} steps</span>
      </div>
      <div className="notice">
        Haven&rsquo;t gathered your parts yet? Start with the{' '}
        <Link href="/guide#supplies">supplies list</Link>.
      </div>

      {walkthrough.steps.map((step, i) => (
        <StepCard key={step.title} step={step} index={i + 1} />
      ))}

      <div
        className="card"
        style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}
      >
        <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-3)' }}>
          {slug === 'api-hub' ? 'Hub running? Keep going.' : 'Want to revisit the hub?'}
        </h2>
        <Link href={`/guide/${other.slug}`} className="btn btn-primary">
          {other.title} →
        </Link>
      </div>
    </main>
  );
}
