import type { PlanetId, Vector3Au } from "./types";

export interface HorizonsEpochFixture {
  label: string;
  jdTdb: number;
  daysSinceJ2000Tdb: number;
  positionEclipticAu: Record<PlanetId, Vector3Au>;
}

export const HORIZONS_FIXTURE_METADATA = {
  source: "NASA/JPL Horizons API",
  center: "Sun center (500@10)",
  targetIds: {
    mercury: "199", venus: "299", earth: "399", mars: "499",
    jupiter: "599", saturn: "699", uranus: "799", neptune: "899",
  } satisfies Record<PlanetId, string>,
  vectorType: "Geometric heliocentric position, ecliptic J2000, AU",
  referenceQuery: "EPHEM_TYPE=VECTORS; VEC_TABLE=1; REF_PLANE=ECLIPTIC; OUT_UNITS=AU-D; CENTER=500@10",
} as const;

export const HORIZONS_EPOCHS: HorizonsEpochFixture[] = [
  {
    label: "J2000.0",
    jdTdb: 2_451_545,
    daysSinceJ2000Tdb: 0,
    positionEclipticAu: {
      mercury: { x: -0.1300936053754522, y: -0.4472876181353563, z: -0.02459830695805179 },
      venus: { x: -0.718302296345389, y: -0.03265430819980606, z: 0.04101418202684621 },
      earth: { x: -0.1771350992727098, y: 0.9672416867665306, z: -0.000004085281582511366 },
      mars: { x: 1.390715921746351, y: -0.01341631815101244, z: -0.03446766277581799 },
      jupiter: { x: 4.001177435589426, y: 2.938575782470499, z: -0.101785283451815 },
      saturn: { x: 6.406410428378656, y: 6.569988452110556, z: -0.3690759730763678 },
      uranus: { x: 14.43185527695361, y: -13.73432340232127, z: -0.2381417679673573 },
      neptune: { x: 16.81204760586415, y: -24.99176325272639, z: 0.1272225117089998 },
    },
  },
  {
    label: "2025-01-01 00:01:09.120 TDB",
    jdTdb: 2_460_676.5008,
    daysSinceJ2000Tdb: 9_131.5008,
    positionEclipticAu: {
      mercury: { x: -0.3872989884873935, y: -0.1617439891915165, z: 0.02230573903361231 },
      venus: { x: 0.4534061203399468, y: 0.5622261672054857, z: -0.01844049207344962 },
      earth: { x: -0.1786972047466026, y: 0.9669802404539994, z: -0.00005109423482320306 },
      mars: { x: -0.521696036024753, y: 1.525231905696224, z: 0.04475579145966151 },
      jupiter: { x: 1.056027564557536, y: 4.971453701592853, z: -0.04427793637849822 },
      saturn: { x: 9.461067839004571, y: -1.764610340764726, z: -0.3458764990046433 },
      uranus: { x: 11.10362619701818, y: 16.09448555522592, z: -0.08419829310458492 },
      neptune: { x: 29.87992919939785, y: -0.6341865860708058, z: -0.6754998655320964 },
    },
  },
];
