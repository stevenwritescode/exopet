import type { Metadata } from 'next';
import { CONTACT_EMAIL } from '@/data/site';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure — ExoPet',
  description: 'How affiliate links and the kit waitlist work on this site.',
};

export default function AffiliateDisclosurePage() {
  return (
    <main className="container section prose" style={{ maxWidth: '46rem' }}>
      <span className="eyebrow">Legal</span>
      <h1 className="page-title">Affiliate disclosure</h1>
      <p>
        Some of the links on this site — in particular the &ldquo;Buy&rdquo;
        buttons on the supplies list — are affiliate links. If you click one
        and make a purchase, ExoPet may earn a small commission from the
        retailer. This never changes the price you pay.
      </p>
      <p>
        ExoPet participates (or intends to participate) in the Amazon Services
        LLC Associates Program, an affiliate advertising program designed to
        provide a means for sites to earn advertising fees by advertising and
        linking to Amazon.com.
      </p>
      <h2>What we link to</h2>
      <p>
        Every part on the supplies list is there because the build needs it,
        not because of its commission. Where a category has many equivalent
        options (relay boards, tubing, power supplies), the links point at
        searches or representative products — buy whichever fits your setup.
      </p>
      <h2>The kit waitlist</h2>
      <p>
        Joining a kit waitlist stores your email address for exactly one
        purpose: telling you when kits become available. We don&rsquo;t sell,
        share, or use it for anything else, and you can ask us to remove it at
        any time.
      </p>
      <h2>Questions</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </main>
  );
}
