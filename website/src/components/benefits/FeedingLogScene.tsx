import { SceneFigure, Chip, PhoneFrame, type SceneProps } from './primitives';

const BAR_HEIGHTS = [22, 30, 18, 26, 34];

export function FeedingLogScene({ variant }: SceneProps) {
  return (
    <SceneFigure
      variant={variant}
      label="Feeding log: a feeding is logged on the phone and appears at the top of Cosmo's feeding timeline."
    >
      {/* animal card */}
      <rect x={40} y={70} width={190} height={220} rx={16} className="panel" />
      <clipPath id="feed-photo">
        <circle cx={135} cy={142} r={44} />
      </clipPath>
      <image
        href="/img/cosmo.jpg"
        x={91}
        y={98}
        width={88}
        height={88}
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#feed-photo)"
      />
      <circle cx={135} cy={142} r={44} className="photo-ring" />
      <text x={135} y={218} textAnchor="middle" className="card-name">Cosmo</text>
      <text x={135} y={240} textAnchor="middle" className="card-sub">Fed 12 minutes ago</text>
      {/* phone with feeding timeline */}
      <PhoneFrame x={290} y={40} width={180} height={280}>
        <text x={310} y={76} className="screen-title">Feedings</text>
        <Chip x={310} y={90} width={140} label="Log feeding" tone="lagoon" />
        <circle cx={380} cy={104} r={12} className="feed-ripple" />
        <g className="feed-entry-new">
          <rect x={310} y={136} width={140} height={30} rx={8} className="feed-entry" />
          <text x={318} y={156} className="feed-entry-text">Crickets · Today</text>
        </g>
        <g className="feed-entry-old">
          <rect x={310} y={174} width={140} height={30} rx={8} className="feed-entry" />
          <text x={318} y={194} className="feed-entry-text">Crickets · Tue</text>
        </g>
        <g className="feed-entry-old">
          <rect x={310} y={212} width={140} height={30} rx={8} className="feed-entry" />
          <text x={318} y={232} className="feed-entry-text">Roaches · Sat</text>
        </g>
        {/* weekly history bars, newest last */}
        <g>
          {BAR_HEIGHTS.map((h, i) => (
            <rect
              key={i}
              x={316 + i * 28}
              y={306 - h}
              width={18}
              height={h}
              rx={3}
              className={i === BAR_HEIGHTS.length - 1 ? 'feed-bar feed-bar-new' : 'feed-bar'}
            />
          ))}
        </g>
      </PhoneFrame>
    </SceneFigure>
  );
}
