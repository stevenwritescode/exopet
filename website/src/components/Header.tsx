import Link from 'next/link';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="wordmark">
          Exo<span>Pet</span>
        </Link>
        <nav className="site-nav">
          <Link href="/guide">Build Guide</Link>
          <Link href="/downloads">Downloads</Link>
          <Link href="/shop" className="btn btn-primary btn-small">
            Get the Kit
          </Link>
        </nav>
      </div>
    </header>
  );
}
