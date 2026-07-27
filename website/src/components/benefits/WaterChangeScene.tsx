import { SceneFigure, TankGlass, Chip, PulseDot, type SceneProps } from './primitives';

export function WaterChangeScene({ variant }: SceneProps) {
  return (
    <SceneFigure
      variant={variant}
      label="Automated water change: on schedule, ExoPet drains a portion of the tank, refills it with fresh water, and logs the change."
    >
      {/* display tank */}
      <clipPath id="wc-clip">
        <rect x={43} y={52} width={244} height={146} />
      </clipPath>
      <g clipPath="url(#wc-clip)">
        <g className="wc-water">
          <rect x={43} y={90} width={244} height={110} className="water-fill" />
          <line x1={43} y1={90} x2={287} y2={90} className="water-surface wc-shimmer" />
        </g>
      </g>
      <TankGlass x={40} y={50} width={250} height={150} />
      {/* sump below */}
      <clipPath id="wc-sump-clip">
        <rect x={93} y={272} width={144} height={56} />
      </clipPath>
      <g clipPath="url(#wc-sump-clip)">
        <rect x={93} y={292} width={144} height={38} className="water-fill" />
        <line x1={93} y1={292} x2={237} y2={292} className="water-surface" />
      </g>
      <TankGlass x={90} y={270} width={150} height={60} />
      <text x={165} y={352} textAnchor="middle" className="scene-label">Sump</text>
      {/* hub */}
      <rect x={320} y={100} width={100} height={64} rx={10} className="hub-body" />
      <text x={370} y={138} textAnchor="middle" className="hub-label">ExoPet</text>
      <circle cx={408} cy={112} r={4} className="hub-led" />
      {/* fresh-water reservoir */}
      <clipPath id="wc-res-clip">
        <rect x={403} y={232} width={74} height={86} />
      </clipPath>
      <g clipPath="url(#wc-res-clip)">
        <rect x={403} y={252} width={74} height={66} className="water-fill" />
        <line x1={403} y1={252} x2={477} y2={252} className="water-surface" />
      </g>
      <TankGlass x={400} y={230} width={80} height={90} />
      <text x={440} y={342} textAnchor="middle" className="scene-label">Fresh water</text>
      {/* drain pipe: tank → down past a valve → sump */}
      <path d="M 290 180 H 315 V 300 H 243" className="pipe" />
      <path d="M 315 190 V 296" className="wc-drain-stream" />
      <PulseDot cx={315} cy={230} className="wc-drain-on" />
      {/* fill pipe: reservoir → up and across → tank */}
      <path d="M 440 230 V 36 H 120 V 50" className="pipe" />
      <path d="M 440 226 V 36 H 120 V 48" className="wc-fill-stream" />
      <PulseDot cx={440} cy={130} className="wc-fill-on" />
      {/* schedule + result chips */}
      <Chip x={150} y={2} width={128} label="Sun · 3:00 AM" tone="ink" className="wc-schedule" />
      <Chip x={50} y={222} width={168} label="10% changed · 4 min" tone="lagoon" className="wc-check" />
    </SceneFigure>
  );
}
