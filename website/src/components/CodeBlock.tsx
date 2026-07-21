'use client';

import { useState } from 'react';
import type { CodeSnippet } from '@/data/guide';

export default function CodeBlock({ snippet }: { snippet: CodeSnippet }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="code-block">
      <button type="button" className="code-copy" onClick={copy}>
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
      <pre>
        <code>{snippet.code}</code>
      </pre>
    </div>
  );
}
