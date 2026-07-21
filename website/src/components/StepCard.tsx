import Link from 'next/link';
import CodeBlock from '@/components/CodeBlock';
import { partById } from '@/data/parts';
import type { GuideStep } from '@/data/guide';

export default function StepCard({
  step,
  index,
}: {
  step: GuideStep;
  index: number;
}) {
  return (
    <div className="step-card">
      <div className="step-number">{index}</div>
      <div className="step-body">
        <h3>{step.title}</h3>
        {step.body.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
        {step.code?.map((snippet) => (
          <CodeBlock key={snippet.code.slice(0, 40)} snippet={snippet} />
        ))}
        {step.imageAlt && (
          <div className="photo-placeholder">📷 {step.imageAlt}</div>
        )}
        {step.partIds && step.partIds.length > 0 && (
          <div className="parts-used">
            <strong>Parts used in this step: </strong>
            {step.partIds.map((id, i) => (
              <span key={id}>
                {i > 0 && ', '}
                <Link href={`/guide#${id}`}>{partById(id).name}</Link>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
