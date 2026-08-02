import type { Metadata } from 'next';
import Quiz from '@/components/quiz/Quiz';

export const metadata: Metadata = {
  title: 'Setup Quiz — ExoPet',
  description:
    'Answer eight quick questions about your enclosure and see what ExoPet could automate for you.',
};

export default function QuizPage() {
  return (
    <main className="container section">
      <span className="eyebrow">Setup quiz</span>
      <h1 className="page-title">What could ExoPet do for your enclosure?</h1>
      <p className="lede">
        Eight quick questions — about two minutes. Your answers also help us
        decide what the hub should do next.
      </p>
      <div style={{ marginTop: 'var(--space-5)' }}>
        <Quiz />
      </div>
    </main>
  );
}
