import { SceneFigure, TankGlass, Chip, PulseDot, type SceneProps } from './primitives';

export function AtoScene({ variant }: SceneProps) {
  return (
    <SceneFigure
      variant={variant}
      label="Auto top-off: as water evaporates, a float switch trips and a dosing pump refills the tank to the target line."
    >
      {/* dotted target line */}
      <line x1={70} y1={130} x2={330} y2={130} className="ato-target" />
      {/* water, clipped to the tank interior; the group's translateY is the level */}
      <clipPath id="ato-clip">
        <rect x={63} y={82} width={274} height={196} />
      </clipPath>
      <g clipPath="url(#ato-clip)">
        <g className="ato-water">
          <rect x={63} y={130} width={274} height={160} className="water-fill" />
          <line x1={63} y1={130} x2={337} y2={130} className="water-surface" />
        </g>
      </g>
      <TankGlass x={60} y={80} width={280} height={200} />
      {/* heat squiggles above the surface */}
      <g className="ato-heat">
        <path d="M 150 72 q 4 -8 0 -16 q -4 -8 0 -16" className="squiggle" />
        <path d="M 200 68 q 4 -8 0 -16 q -4 -8 0 -16" className="squiggle" />
        <path d="M 250 72 q 4 -8 0 -16 q -4 -8 0 -16" className="squiggle" />
      </g>
      {/* float switch riding the surface on the right wall */}
      <g className="ato-float">
        <circle cx={310} cy={126} r={9} className="float-body" />
        <line x1={319} y1={126} x2={334} y2={126} className="float-arm" />
      </g>
      {/* dosing pump, supply line into the tank */}
      <rect x={380} y={200} width={70} height={44} rx={8} className="pump-body" />
      <path d="M 380 214 H 352 V 96 H 302 V 86" className="pump-line" />
      <PulseDot cx={415} cy={222} className="ato-pump-on" />
      <Chip x={356} y={140} width={118} label="Top-off · 40 ml" tone="lagoon" className="ato-pump-on" />
    </SceneFigure>
  );
}
