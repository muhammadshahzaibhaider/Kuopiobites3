/**
 * Dotted "planet" map: a latitude/longitude dot grid with studio + client hubs
 * and light arcs between them. Purely decorative SVG (no assets, no tracking).
 */

const SIZE = 640;
const CENTER = SIZE / 2;
const RADIUS = 268;

/** Equirectangular → orthographic-ish projection onto a tilted globe. */
function project(lon: number, lat: number, tilt = 18) {
  const rad = Math.PI / 180;
  const x0 = Math.cos(lat * rad) * Math.cos(lon * rad);
  const y0 = Math.sin(lat * rad);
  const z0 = Math.cos(lat * rad) * Math.sin(lon * rad);

  /* Rotate around X to give the globe a slight tilt. */
  const y1 = y0 * Math.cos(tilt * rad) - z0 * Math.sin(tilt * rad);
  const z1 = y0 * Math.sin(tilt * rad) + z0 * Math.cos(tilt * rad);

  return {
    x: CENTER + x0 * RADIUS,
    y: CENTER - y1 * RADIUS,
    visible: z1 > -0.15,
  };
}

const HUBS = [
  { name: "Gujranwala", lon: 74.2, lat: 32.2, primary: true },
  { name: "London", lon: -0.1, lat: 51.5, primary: false },
  { name: "Dubai", lon: 55.3, lat: 25.2, primary: false },
  { name: "Austin", lon: -97.7, lat: 30.3, primary: false },
  { name: "Singapore", lon: 103.8, lat: 1.35, primary: false },
];

const DOTS: { x: number; y: number; opacity: number }[] = [];
for (let lat = -78; lat <= 78; lat += 7) {
  const circumference = Math.cos((lat * Math.PI) / 180);
  const step = 7 / Math.max(circumference, 0.18);
  for (let lon = -180; lon < 180; lon += step) {
    const point = project(lon, lat);
    if (!point.visible) continue;
    DOTS.push({
      x: point.x,
      y: point.y,
      opacity: 0.12 + Math.max(0, Math.cos((lat * Math.PI) / 180)) * 0.3,
    });
  }
}

const hubPoints = HUBS.map((hub) => ({ ...hub, ...project(hub.lon, hub.lat) })).filter(
  (hub) => hub.visible,
);
const origin = hubPoints.find((hub) => hub.primary) ?? hubPoints[0];

export function WorldMap() {
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full max-w-2xl"
        role="img"
        aria-label="Dotted globe showing studio and client locations worldwide"
      >
        <defs>
          <radialGradient id="globe-fade" cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="globe-glow" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#a9c7ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#a9c7ff" stopOpacity="0" />
          </radialGradient>
          <mask id="globe-mask">
            <rect width={SIZE} height={SIZE} fill="url(#globe-fade)" />
          </mask>
        </defs>

        <circle cx={CENTER} cy={CENTER} r={RADIUS * 1.05} fill="url(#globe-glow)" />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />

        <g mask="url(#globe-mask)" fill="#ffffff">
          {DOTS.map((dot, index) => (
            <circle key={index} cx={dot.x} cy={dot.y} r="1.6" opacity={dot.opacity} />
          ))}
        </g>

        {/* Light arcs from the studio to each client hub */}
        {hubPoints
          .filter((hub) => hub !== origin)
          .map((hub) => {
            const midX = (origin.x + hub.x) / 2;
            const midY = (origin.y + hub.y) / 2 - 60;
            return (
              <path
                key={`arc-${hub.name}`}
                d={`M ${origin.x} ${origin.y} Q ${midX} ${midY} ${hub.x} ${hub.y}`}
                fill="none"
                stroke="rgba(169,199,255,0.35)"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
            );
          })}

        {hubPoints.map((hub) => (
          <g key={hub.name}>
            <circle
              cx={hub.x}
              cy={hub.y}
              r={hub.primary ? 12 : 8}
              fill="rgba(169,199,255,0.12)"
            />
            <circle cx={hub.x} cy={hub.y} r={hub.primary ? 3.5 : 2.4} fill="#ffffff" />
            <text
              x={hub.x + (hub.primary ? 14 : 11)}
              y={hub.y + 4}
              fill={hub.primary ? "#ffffff" : "rgba(255,255,255,0.55)"}
              fontSize="11"
              fontFamily="var(--font-geist-mono), monospace"
              letterSpacing="1"
            >
              {hub.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
