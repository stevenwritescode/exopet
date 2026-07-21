'use client';

import { useState } from 'react';
import { WAITLIST_ENDPOINT, CONTACT_EMAIL } from '@/data/site';

type Status = 'idle' | 'sending' | 'success' | 'error';

export default function WaitlistForm({ kitName }: { kitName: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  // No endpoint configured yet — degrade to a mailto link so signups
  // still reach us.
  if (!WAITLIST_ENDPOINT) {
    const subject = encodeURIComponent(`ExoPet waitlist: ${kitName}`);
    const body = encodeURIComponent(
      `Hi! Please add me to the waitlist for the ${kitName}.`
    );
    return (
      <a
        className="btn btn-primary"
        href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`}
      >
        Join the waitlist
      </a>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, kit: kitName }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <p className="form-status success">
        You&rsquo;re on the list — we&rsquo;ll email you when the {kitName} is
        ready.
      </p>
    );
  }

  return (
    <form className="waitlist-form" onSubmit={submit}>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label={`Email address for the ${kitName} waitlist`}
      />
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === 'sending'}
      >
        {status === 'sending' ? 'Joining…' : 'Join the waitlist'}
      </button>
      {status === 'error' && (
        <p className="form-status error">
          Something went wrong — try again, or email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      )}
    </form>
  );
}
