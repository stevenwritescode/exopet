import type { Metadata } from 'next';
import StlCard from '@/components/StlCard';
import { stlModels } from '@/data/stls';

export const metadata: Metadata = {
  title: 'Downloads — ExoPet',
  description:
    'Free STL files for 3D-printing ExoPet cases, mounts, stands, and brackets.',
};

export default function DownloadsPage() {
  return (
    <main className="container section">
      <span className="eyebrow">Downloads</span>
      <h1 className="page-title">Print the parts</h1>
      <p className="lede">
        Every printed part of an ExoPet build, free to download. Use PETG for
        anything that lives near water — it shrugs off humidity that makes PLA
        soft.
      </p>
      <div className="notice">
        These models are licensed under{' '}
        <a
          href="https://creativecommons.org/licenses/by-nc/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          CC BY-NC 4.0
        </a>
        : print as many as you like for yourself, share remixes with credit,
        but please don&rsquo;t sell them.
      </div>
      <div className="grid-3" style={{ marginTop: 'var(--space-5)' }}>
        {stlModels.map((m) => (
          <StlCard key={m.id} model={m} />
        ))}
      </div>
    </main>
  );
}
