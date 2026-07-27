'use client';

import type { ReactNode } from 'react';
import { useInView } from './useInView';

export type SceneVariant = 'wide' | 'square' | 'portrait';

export interface SceneProps {
  variant?: SceneVariant;
}

/**
 * Outer wrapper for every scene: in-view animation gating + variant plumbing.
 * Only the 'wide' variant has a designed layout today; square/portrait exist
 * for the future social-crop page (see spec).
 */
export function SceneFigure({
  variant = 'wide',
  label,
  viewBox = '0 0 520 360',
  children,
}: {
  variant?: SceneVariant;
  label: string;
  viewBox?: string;
  children: ReactNode;
}) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <figure
      ref={ref}
      className={`benefit-scene${inView ? ' is-visible' : ''}`}
      data-variant={variant}
      role="img"
      aria-label={label}
    >
      <svg viewBox={viewBox} className="benefit-svg" aria-hidden="true">
        {children}
      </svg>
    </figure>
  );
}

/** Open-top aquarium outline (left wall, floor, right wall). */
export function TankGlass({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return (
    <path
      d={`M ${x} ${y} V ${y + height} H ${x + width} V ${y}`}
      fill="none"
      stroke="var(--ink)"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Pill-shaped label chip, 28px tall, text centered. */
export function Chip({
  x,
  y,
  width,
  label,
  tone = 'lagoon',
  className,
}: {
  x: number;
  y: number;
  width: number;
  label: string;
  tone?: 'lagoon' | 'amber' | 'ink';
  className?: string;
}) {
  return (
    <g className={className}>
      <rect x={x} y={y} width={width} height={28} rx={14} className={`chip chip-${tone}`} />
      <text x={x + width / 2} y={y + 19} textAnchor="middle" className="chip-text">
        {label}
      </text>
    </g>
  );
}

/** Solid dot with an infinitely pulsing ring (activity indicator). */
export function PulseDot({
  cx,
  cy,
  r = 6,
  className,
}: {
  cx: number;
  cy: number;
  r?: number;
  className?: string;
}) {
  return (
    <g className={className}>
      <circle cx={cx} cy={cy} r={r} className="pulse-core" />
      <circle cx={cx} cy={cy} r={r} className="pulse-ring" />
    </g>
  );
}

/** Rounded phone body with an inset screen; children render on the screen. */
export function PhoneFrame({
  x,
  y,
  width,
  height,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  children?: ReactNode;
}) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={18} className="phone-body" />
      <rect
        x={x + 6}
        y={y + 6}
        width={width - 12}
        height={height - 12}
        rx={12}
        className="phone-screen"
      />
      {children}
    </g>
  );
}
