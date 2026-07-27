import type { ReactNode } from 'react';

export function BenefitRow({
  title,
  body,
  scene,
  reverse = false,
}: {
  title: string;
  body: string;
  scene: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className={`benefit-row${reverse ? ' benefit-row-reverse' : ''}`}>
      <div className="benefit-copy">
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      {scene}
    </div>
  );
}
