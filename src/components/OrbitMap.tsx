import { useMemo } from "react";
import { PLANETS } from "../science/planets";
import { orbitPath, planetaryPositions } from "../science/orbit";
import { eclipticToMap } from "../science/coordinates";
import { displayDistance, displayPosition } from "../science/scale";
import type { BodyId, ScaleMode } from "../science/types";

interface OrbitMapProps {
  daysSinceEpoch: number;
  mode: ScaleMode;
  selectedBody: BodyId | null;
  onSelect: (id: BodyId) => void;
}

const WIDTH = 1000;
const HEIGHT = 620;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const MAP_RADIUS = 270;

function mapPoint(point: { x: number; y: number; z: number }, factor: number) {
  const mapPosition = eclipticToMap(point);
  return { x: CENTER_X + mapPosition.x * factor, y: CENTER_Y - mapPosition.y * factor };
}

export function OrbitMap({ daysSinceEpoch, mode, selectedBody, onSelect }: OrbitMapProps) {
  const factor = MAP_RADIUS / displayDistance(30.2, mode);
  const positions = planetaryPositions(daysSinceEpoch);
  const paths = useMemo(() => PLANETS.map((planet) => ({
    planet,
    points: orbitPath(planet.orbitalElements, 300).map((point) =>
      mapPoint(displayPosition(point, mode), factor)),
  })), [mode, factor]);

  return (
    <div className="map-wrap">
      <svg className="orbit-map" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Live top-down map of planetary orbits">
        <defs>
          <radialGradient id="sun-glow">
            <stop offset="0" stopColor="#ffe7b0" />
            <stop offset="0.35" stopColor="#ffba59" />
            <stop offset="1" stopColor="#f78035" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={CENTER_X} cy={CENTER_Y} r="25" fill="url(#sun-glow)" />
        <circle cx={CENTER_X} cy={CENTER_Y} r="4.3" fill="#ffe5aa" />
        <text x={CENTER_X + 13} y={CENTER_Y + 5} className="map-sun-label">SUN</text>
        {paths.map(({ planet, points }) => {
          const d = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ") + " Z";
          const position = mapPoint(displayPosition(positions[planet.id], mode), factor);
          const selected = selectedBody === planet.id;
          const labelShift = position.x > CENTER_X ? 10 : -10;
          return (
            <g key={planet.id}>
              <path d={d} fill="none" stroke={planet.color} strokeOpacity={selected ? 0.56 : 0.22} strokeWidth={selected ? 1.8 : 1} />
              <g
                className="map-planet"
                role="button"
                tabIndex={0}
                aria-label={`Select ${planet.name}`}
                onClick={() => onSelect(planet.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onSelect(planet.id);
                }}
              >
                {selected && <circle cx={position.x} cy={position.y} r="10" fill={planet.color} opacity="0.2" />}
                <circle cx={position.x} cy={position.y} r={selected ? 4.8 : 3.2} fill={planet.color} />
                <text x={position.x + labelShift} y={position.y - 7} textAnchor={labelShift > 0 ? "start" : "end"} className="map-planet-label">
                  {planet.name.toUpperCase()}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <div className="map-axis"><span>TOP-DOWN ORBITAL PLANE</span><span>POSITIONS UPDATED LIVE</span></div>
    </div>
  );
}
