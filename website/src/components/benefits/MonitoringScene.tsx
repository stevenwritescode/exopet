import { SceneFigure, TankGlass, Chip, PulseDot, PhoneFrame, type SceneProps } from './primitives';

export function MonitoringScene({ variant }: SceneProps) {
  return (
    <SceneFigure
      variant={variant}
      label="Monitoring and alerts: a live temperature chart nears the threshold you set, an alert appears on the phone, and the heater relay switches off."
    >
      {/* tank with probe and heater */}
      <clipPath id="mon-clip">
        <rect x={33} y={122} width={164} height={146} />
      </clipPath>
      <g clipPath="url(#mon-clip)">
        <rect x={33} y={166} width={164} height={102} className="water-fill" />
        <line x1={33} y1={166} x2={197} y2={166} className="water-surface" />
      </g>
      <TankGlass x={30} y={120} width={170} height={150} />
      <path d="M 100 96 V 208" className="probe-wire" />
      <circle cx={100} cy={214} r={7} className="probe-tip" />
      <Chip x={40} y={62} width={96} label="78.2 °F" tone="ink" />
      <g className="mon-heater">
        <rect x={150} y={228} width={14} height={36} rx={4} className="heater-body" />
        <path d="M 153 236 h 8 M 153 245 h 8 M 153 254 h 8" className="heater-coil" />
      </g>
      {/* chart panel with threshold band */}
      <rect x={230} y={60} width={250} height={160} rx={12} className="panel" />
      <rect x={238} y={70} width={234} height={30} className="mon-band" />
      <text x={246} y={90} className="mon-band-label">80 °F max</text>
      <path
        d="M 244 192 L 268 188 L 292 194 L 316 184 L 340 170 L 364 152 L 388 126 L 404 112 L 420 118 L 444 138 L 464 146"
        pathLength={100}
        className="mon-line"
      />
      <PulseDot cx={464} cy={146} r={5} className="mon-live-dot" />
      {/* phone with alert */}
      <PhoneFrame x={300} y={240} width={150} height={110}>
        <Chip x={314} y={256} width={122} label="⚠ Temp high" tone="amber" className="mon-alert" />
        <text x={314} y={310} className="mon-alert-sub">Heater switched off</text>
      </PhoneFrame>
    </SceneFigure>
  );
}
