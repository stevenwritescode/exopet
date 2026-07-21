import Link from 'next/link';
import { CONTACT_EMAIL, GITHUB_URL } from '@/data/site';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div>
          <div className="wordmark" style={{ marginBottom: '0.75rem' }}>
            Exo<span>Pet</span>
          </div>
          <p className="footer-disclosure">
            Some links on this site are affiliate links. ExoPet may earn a
            commission when you buy through them, at no extra cost to you.{' '}
            <Link href="/legal/affiliate-disclosure">Learn more</Link>.
          </p>
        </div>
        <div className="footer-links">
          <Link href="/guide">Build Guide</Link>
          <Link href="/downloads">Downloads</Link>
          <Link href="/shop">Shop</Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
        </div>
      </div>
    </footer>
  );
}
