import type { BodyId, CelestialBody, PlanetData } from "./types";

export const EPOCH_LABEL = "J2000.0 · 2000-01-01 12:00 UTC";

// Approximate J2000 mean elements from JPL's planetary orbital elements.
// Angular rates are derived from the documented sidereal periods in this data set.
const definitions: Omit<PlanetData, "orbitalElements">[] = [
  {
    id: "mercury", name: "Mercury",
    description: "The smallest planet, racing around the Sun in just 88 days. Its ancient, cratered surface experiences the Solar System's most extreme temperature swings.",
    meanDiameterKm: 4_879.4, meanDistanceAu: 0.3871, orbitalPeriodDays: 87.969,
    rotationPeriodHours: 1_407.6, eccentricity: 0.2056, inclinationDeg: 7.005,
    color: "#b9a58f",
    visual: { baseColor: "#a99a88", roughness: 0.96 },
  },
  {
    id: "venus", name: "Venus",
    description: "A world wrapped in dense clouds of carbon dioxide. Runaway greenhouse warming makes Venus the hottest planet, despite not being closest to the Sun.",
    meanDiameterKm: 12_104, meanDistanceAu: 0.7233, orbitalPeriodDays: 224.701,
    rotationPeriodHours: -5_832.5, eccentricity: 0.0068, inclinationDeg: 3.395,
    color: "#e5b875",
    visual: { baseColor: "#d8a85f", roughness: 0.82, atmosphereColor: "#edc984" },
  },
  {
    id: "earth", name: "Earth",
    description: "Our pale blue home: the only known world with stable surface liquid water and life. A dynamic atmosphere and oceans shape its changing appearance.",
    meanDiameterKm: 12_742, meanDistanceAu: 1.0000, orbitalPeriodDays: 365.256,
    rotationPeriodHours: 23.934, eccentricity: 0.0167, inclinationDeg: 0.000,
    color: "#79a9e8",
    visual: { baseColor: "#3978bb", roughness: 0.7, atmosphereColor: "#5daeff" },
  },
  {
    id: "mars", name: "Mars",
    description: "A cold desert world with the largest volcano and canyon in the Solar System. Robotic explorers study its geology and search for signs of ancient habitability.",
    meanDiameterKm: 6_779, meanDistanceAu: 1.5237, orbitalPeriodDays: 686.980,
    rotationPeriodHours: 24.623, eccentricity: 0.0934, inclinationDeg: 1.850,
    color: "#df8262",
    visual: { baseColor: "#b95f47", roughness: 0.94, atmosphereColor: "#df8262" },
  },
  {
    id: "jupiter", name: "Jupiter",
    description: "The giant of the planetary system. Its banded atmosphere and centuries-old Great Red Spot swirl above a deep interior of hydrogen and helium.",
    meanDiameterKm: 139_820, meanDistanceAu: 5.2026, orbitalPeriodDays: 4_332.59,
    rotationPeriodHours: 9.925, eccentricity: 0.0489, inclinationDeg: 1.303,
    color: "#d8a77c",
    visual: { baseColor: "#c9956c", roughness: 0.89, atmosphereColor: "#e8c6a4" },
  },
  {
    id: "saturn", name: "Saturn",
    description: "A gas giant encircled by a spectacular system of icy rings. Its low density, fast winds, and many moons make it one of the Solar System's most distinctive worlds.",
    meanDiameterKm: 116_460, meanDistanceAu: 9.5549, orbitalPeriodDays: 10_759.22,
    rotationPeriodHours: 10.656, eccentricity: 0.0565, inclinationDeg: 2.489,
    color: "#e4c487",
    visual: {
      baseColor: "#c8aa73", roughness: 0.88, atmosphereColor: "#ead4a6",
      ringColor: "#c6ad83", ringInnerRadius: 1.28, ringOuterRadius: 2.15,
    },
  },
  {
    id: "uranus", name: "Uranus",
    description: "An ice giant tipped dramatically on its side. Methane in its upper atmosphere absorbs red light, giving the distant planet its soft cyan hue.",
    meanDiameterKm: 50_724, meanDistanceAu: 19.2184, orbitalPeriodDays: 30_688.5,
    rotationPeriodHours: -17.24, eccentricity: 0.0463, inclinationDeg: 0.773,
    color: "#90d4d8",
    visual: { baseColor: "#80c7ce", roughness: 0.73, atmosphereColor: "#a4eff0" },
  },
  {
    id: "neptune", name: "Neptune",
    description: "A deep-blue ice giant in the distant dark. Supersonic winds sweep its atmosphere, while a faint ring system circles this remote world.",
    meanDiameterKm: 49_244, meanDistanceAu: 30.1104, orbitalPeriodDays: 60_182,
    rotationPeriodHours: 16.11, eccentricity: 0.0095, inclinationDeg: 1.770,
    color: "#6389e8",
    visual: { baseColor: "#4168cb", roughness: 0.75, atmosphereColor: "#719dff" },
  },
];

// JPL approximate elements for 1800–2050; angular values are referenced to J2000.
// Mean anomaly = mean longitude - longitude of perihelion; omega = varpi - node.
const jplAngles: Record<PlanetData["id"], [number, number, number]> = {
  mercury: [252.2503235, 77.45779628, 48.33076593],
  venus: [181.9790995, 131.60246718, 76.67984255],
  earth: [100.46457166, 102.93768193, 0],
  mars: [-4.55343205, -23.94362959, 49.55953891],
  jupiter: [34.39644051, 14.72847983, 100.47390909],
  saturn: [49.95424423, 92.59887831, 113.66242448],
  uranus: [313.23810451, 170.9542763, 74.01692503],
  neptune: [-55.12002969, 44.96476227, 131.78422574],
};

const semiMajorAxes: Record<PlanetData["id"], number> = {
  mercury: 0.38709927, venus: 0.72333566, earth: 1.00000261, mars: 1.52371034,
  jupiter: 5.202887, saturn: 9.53667594, uranus: 19.18916464, neptune: 30.06992276,
};

const eccentricities: Record<PlanetData["id"], number> = {
  mercury: 0.20563593, venus: 0.00677672, earth: 0.01671123, mars: 0.0933941,
  jupiter: 0.04838624, saturn: 0.05386179, uranus: 0.04725744, neptune: 0.00859048,
};

const inclinations: Record<PlanetData["id"], number> = {
  mercury: 7.00497902, venus: 3.39467605, earth: -0.00001531, mars: 1.84969142,
  jupiter: 1.30439695, saturn: 2.48599187, uranus: 0.77263783, neptune: 1.769952, // JPL
};

export const PLANETS: PlanetData[] = definitions.map((planet) => {
  const [meanLongitude, longitudePerihelion, node] = jplAngles[planet.id];
  return {
    ...planet,
    eccentricity: eccentricities[planet.id],
    inclinationDeg: inclinations[planet.id],
    orbitalElements: {
      semiMajorAxisAu: semiMajorAxes[planet.id],
      eccentricity: eccentricities[planet.id],
      inclinationDeg: inclinations[planet.id],
      longitudeAscendingNodeDeg: node,
      argumentPerihelionDeg: longitudePerihelion - node,
      meanAnomalyAtEpochDeg: meanLongitude - longitudePerihelion,
      meanMotionDegPerDay: 360 / planet.orbitalPeriodDays,
    },
  };
});

export const SUN: CelestialBody = {
  id: "sun",
  name: "Sun",
  meanDiameterKm: 1_392_700,
  description: "The star at the centre of our planetary system. Its gravity holds the Solar System together, and its energy powers life on Earth.",
  color: "#f6bd67",
};

export const BODIES: CelestialBody[] = [SUN, ...PLANETS.map(({ id, name, meanDiameterKm, description, color }) => ({
  id, name, meanDiameterKm, description, color,
}))];

export function getBody(id: BodyId): CelestialBody | undefined {
  return BODIES.find((body) => body.id === id);
}

export function getPlanet(id: BodyId): PlanetData | undefined {
  return PLANETS.find((planet) => planet.id === id);
}
