import type {
  BodyId, CelestialBody, OrbitalElementRates, PlanetData, PlanetId, RotationModel, SunData,
} from "./types";

export const EPOCH_LABEL = "J2000.0 · JD 2451545.0 TDB";
export const J2000_JD_TDB = 2_451_545;
export const DAYS_PER_JULIAN_CENTURY = 36_525;

function rotation(
  siderealPeriodHours: number,
  axialTiltDeg: number,
  primeMeridianAtEpochDeg: number,
  primeMeridianRateDegPerDay: number,
  poleRightAscensionDeg: number,
  poleRightAscensionRateDegPerCentury: number,
  poleDeclinationDeg: number,
  poleDeclinationRateDegPerCentury: number,
): RotationModel {
  return {
    siderealPeriodHours,
    direction: primeMeridianRateDegPerDay < 0 ? "retrograde" : "prograde",
    axialTiltDeg,
    primeMeridianAtEpochDeg,
    primeMeridianRateDegPerDay,
    poleRightAscensionDeg,
    poleRightAscensionRateDegPerCentury,
    poleDeclinationDeg,
    poleDeclinationRateDegPerCentury,
  };
}

export const SUN: SunData = {
  id: "sun",
  name: "Sun",
  kind: "star",
  description: "The G2 V star at the centre of our planetary system. Its gravity holds the planets in orbit and its radiation powers Earth's climate and biosphere.",
  physical: {
    meanRadiusKm: 695_700,
    meanDiameterKm: 1_391_400,
    massKg: 1.9884e30,
    meanDensityKgM3: 1_408,
    referenceGravityMps2: 274,
    escapeVelocityKms: 617.6,
    meanTemperatureC: null,
    atmosphere: "Solar atmosphere: photosphere, chromosphere, and corona; the photosphere is mostly hydrogen and helium.",
  },
  stellar: { luminosityW: 3.828e26, effectiveTemperatureK: 5_772 },
  rotation: rotation(609.12, 7.25, 84.176, 14.1844, 286.13, 0, 63.87, 0),
  color: "#f6bd67",
  sourceIds: ["nasa-sun", "naif-pck"],
  measurementNote: "Radius, mass, density, gravity, and escape speed are rounded reference values. Solar rotation is differential; the adopted period is for 16° latitude.",
};

interface JplElementRecord {
  a: number;
  e: number;
  inclination: number;
  meanLongitude: number;
  longitudePerihelion: number;
  node: number;
  rates: OrbitalElementRates;
}

const jplElements: Record<PlanetId, JplElementRecord> = {
  mercury: {
    a: 0.38709927, e: 0.20563593, inclination: 7.00497902,
    meanLongitude: 252.2503235, longitudePerihelion: 77.45779628, node: 48.33076593,
    rates: {
      semiMajorAxisAuPerCentury: 0.00000037, eccentricityPerCentury: 0.00001906,
      inclinationDegPerCentury: -0.00594749, meanLongitudeDegPerCentury: 149472.67411175,
      longitudePerihelionDegPerCentury: 0.16047689, longitudeAscendingNodeDegPerCentury: -0.12534081,
    },
  },
  venus: {
    a: 0.72333566, e: 0.00677672, inclination: 3.39467605,
    meanLongitude: 181.9790995, longitudePerihelion: 131.60246718, node: 76.67984255,
    rates: {
      semiMajorAxisAuPerCentury: 0.0000039, eccentricityPerCentury: -0.00004107,
      inclinationDegPerCentury: -0.0007889, meanLongitudeDegPerCentury: 58517.81538729,
      longitudePerihelionDegPerCentury: 0.00268329, longitudeAscendingNodeDegPerCentury: -0.27769418,
    },
  },
  earth: {
    a: 1.00000261, e: 0.01671123, inclination: -0.00001531,
    meanLongitude: 100.46457166, longitudePerihelion: 102.93768193, node: 0,
    rates: {
      semiMajorAxisAuPerCentury: 0.00000562, eccentricityPerCentury: -0.00004392,
      inclinationDegPerCentury: -0.01294668, meanLongitudeDegPerCentury: 35999.37244981,
      longitudePerihelionDegPerCentury: 0.32327364, longitudeAscendingNodeDegPerCentury: 0,
    },
  },
  mars: {
    a: 1.52371034, e: 0.0933941, inclination: 1.84969142,
    meanLongitude: -4.55343205, longitudePerihelion: -23.94362959, node: 49.55953891,
    rates: {
      semiMajorAxisAuPerCentury: 0.00001847, eccentricityPerCentury: 0.00007882,
      inclinationDegPerCentury: -0.00813131, meanLongitudeDegPerCentury: 19140.30268499,
      longitudePerihelionDegPerCentury: 0.44441088, longitudeAscendingNodeDegPerCentury: -0.29257343,
    },
  },
  jupiter: {
    a: 5.202887, e: 0.04838624, inclination: 1.30439695,
    meanLongitude: 34.39644051, longitudePerihelion: 14.72847983, node: 100.47390909,
    rates: {
      semiMajorAxisAuPerCentury: -0.00011607, eccentricityPerCentury: -0.00013253,
      inclinationDegPerCentury: -0.00183714, meanLongitudeDegPerCentury: 3034.74612775,
      longitudePerihelionDegPerCentury: 0.21252668, longitudeAscendingNodeDegPerCentury: 0.20469106,
    },
  },
  saturn: {
    a: 9.53667594, e: 0.05386179, inclination: 2.48599187,
    meanLongitude: 49.95424423, longitudePerihelion: 92.59887831, node: 113.66242448,
    rates: {
      semiMajorAxisAuPerCentury: -0.0012506, eccentricityPerCentury: -0.00050991,
      inclinationDegPerCentury: 0.00193609, meanLongitudeDegPerCentury: 1222.49362201,
      longitudePerihelionDegPerCentury: -0.41897216, longitudeAscendingNodeDegPerCentury: -0.28867794,
    },
  },
  uranus: {
    a: 19.18916464, e: 0.04725744, inclination: 0.77263783,
    meanLongitude: 313.23810451, longitudePerihelion: 170.9542763, node: 74.01692503,
    rates: {
      semiMajorAxisAuPerCentury: -0.00196176, eccentricityPerCentury: -0.00004397,
      inclinationDegPerCentury: -0.00242939, meanLongitudeDegPerCentury: 428.48202785,
      longitudePerihelionDegPerCentury: 0.40805281, longitudeAscendingNodeDegPerCentury: 0.04240589,
    },
  },
  neptune: {
    a: 30.06992276, e: 0.00859048, inclination: 1.77004347,
    meanLongitude: -55.12002969, longitudePerihelion: 44.96476227, node: 131.78422574,
    rates: {
      semiMajorAxisAuPerCentury: 0.00026291, eccentricityPerCentury: 0.00005105,
      inclinationDegPerCentury: 0.00035372, meanLongitudeDegPerCentury: 218.45945325,
      longitudePerihelionDegPerCentury: -0.32241464, longitudeAscendingNodeDegPerCentury: -0.00508664,
    },
  },
};

const commonSources = ["nasa-factsheet", "nasa-compare", "jpl-elements", "naif-pck"] as const;

interface PlanetProfile {
  id: PlanetId;
  name: string;
  kind: Exclude<PlanetData["kind"], "star">;
  description: string;
  meanRadiusKm: number;
  massKg: number;
  meanDensityKgM3: number;
  referenceGravityMps2: number;
  escapeVelocityKms: number;
  meanTemperatureC: number;
  atmosphere: string;
  orbitalPeriodDays: number;
  rotation: RotationModel;
  color: string;
  visual: PlanetData["visual"];
}

const planetProfiles: PlanetProfile[] = [
  {
    id: "mercury", name: "Mercury", kind: "terrestrial",
    description: "The smallest planet, racing around the Sun in just under 88 days. Its cratered surface experiences extreme temperature swings.",
    meanRadiusKm: 2_439.7, massKg: 3.301e23, meanDensityKgM3: 5_429,
    referenceGravityMps2: 3.7, escapeVelocityKms: 4.3, meanTemperatureC: 167,
    atmosphere: "A tenuous exosphere containing oxygen, sodium, hydrogen, helium, and potassium.",
    orbitalPeriodDays: 87.969, rotation: rotation(1_407.6, 0.034, 329.5988, 6.1385108, 281.0103, -0.0328, 61.4155, -0.0049),
    color: "#b9a58f", visual: { baseColor: "#a99a88", roughness: 0.96 },
  },
  {
    id: "venus", name: "Venus", kind: "terrestrial",
    description: "A rocky world wrapped in dense clouds. Runaway greenhouse warming makes Venus the hottest planet, despite not being closest to the Sun.",
    meanRadiusKm: 6_051.8, massKg: 4.86731e24, meanDensityKgM3: 5_243,
    referenceGravityMps2: 8.9, escapeVelocityKms: 10.4, meanTemperatureC: 464,
    atmosphere: "Dense atmosphere dominated by carbon dioxide, with nitrogen as the next most abundant constituent.",
    orbitalPeriodDays: 224.701, rotation: rotation(5_832.5, 177.4, 160.2, -1.4813688, 272.76, 0, 67.16, 0),
    color: "#e5b875", visual: { baseColor: "#d8a85f", roughness: 0.82, atmosphereColor: "#edc984" },
  },
  {
    id: "earth", name: "Earth", kind: "terrestrial",
    description: "Our pale blue home: the only known world with stable surface liquid water and life. A dynamic atmosphere and oceans shape its appearance.",
    meanRadiusKm: 6_371, massKg: 5.9722e24, meanDensityKgM3: 5_514,
    referenceGravityMps2: 9.8, escapeVelocityKms: 11.2, meanTemperatureC: 15,
    atmosphere: "Nitrogen- and oxygen-rich atmosphere, with argon, carbon dioxide, and variable water vapour.",
    orbitalPeriodDays: 365.256, rotation: rotation(23.9345, 23.44, 190.147, 360.9856235, 0, -0.641, 90, -0.557),
    color: "#79a9e8", visual: { baseColor: "#3978bb", roughness: 0.7, atmosphereColor: "#5daeff" },
  },
  {
    id: "mars", name: "Mars", kind: "terrestrial",
    description: "A cold desert world with the Solar System's largest volcano and canyon. Robotic explorers study its geology and ancient habitability.",
    meanRadiusKm: 3_389.5, massKg: 6.4171e23, meanDensityKgM3: 3_934,
    referenceGravityMps2: 3.7, escapeVelocityKms: 5, meanTemperatureC: -65,
    atmosphere: "Thin atmosphere dominated by carbon dioxide, with nitrogen and argon.",
    orbitalPeriodDays: 686.98, rotation: rotation(24.6229, 25.19, 176.049863, 350.891982443297, 317.68143, -0.1061, 52.8865, -0.0609),
    color: "#df8262", visual: { baseColor: "#b95f47", roughness: 0.94, atmosphereColor: "#df8262" },
  },
  {
    id: "jupiter", name: "Jupiter", kind: "gas-giant",
    description: "The giant of the planetary system. Banded clouds and the long-lived Great Red Spot swirl above a deep hydrogen-helium interior.",
    meanRadiusKm: 69_911, massKg: 1.89813e27, meanDensityKgM3: 1_326,
    referenceGravityMps2: 23.1, escapeVelocityKms: 59.5, meanTemperatureC: -110,
    atmosphere: "Primarily hydrogen and helium, with methane, ammonia, and other trace constituents.",
    orbitalPeriodDays: 4_332.59, rotation: rotation(9.925, 3.1, 284.95, 870.536, 268.056595, -0.006499, 64.495303, 0.002413),
    color: "#d8a77c", visual: { baseColor: "#c9956c", roughness: 0.89, atmosphereColor: "#e8c6a4" },
  },
  {
    id: "saturn", name: "Saturn", kind: "gas-giant",
    description: "A gas giant encircled by a spectacular system of icy rings. Its low density, fast winds, and many moons distinguish this world.",
    meanRadiusKm: 58_232, massKg: 5.6834e26, meanDensityKgM3: 687,
    referenceGravityMps2: 9, escapeVelocityKms: 35.5, meanTemperatureC: -140,
    atmosphere: "Primarily hydrogen and helium, with methane, ammonia, and trace compounds.",
    orbitalPeriodDays: 10_759.22, rotation: rotation(10.656, 26.7, 38.9, 810.7939024, 40.589, -0.036, 83.537, -0.004),
    color: "#e4c487",
    visual: {
      baseColor: "#c8aa73", roughness: 0.88, atmosphereColor: "#ead4a6",
      ringColor: "#c6ad83", ringInnerRadius: 1.28, ringOuterRadius: 2.15,
    },
  },
  {
    id: "uranus", name: "Uranus", kind: "ice-giant",
    description: "An ice giant tipped dramatically on its side. Methane in its upper atmosphere absorbs red light, giving the planet its cyan hue.",
    meanRadiusKm: 25_362, massKg: 8.681e25, meanDensityKgM3: 1_270,
    referenceGravityMps2: 8.7, escapeVelocityKms: 21.3, meanTemperatureC: -195,
    atmosphere: "Hydrogen and helium with methane, which absorbs red wavelengths.",
    orbitalPeriodDays: 30_688.5, rotation: rotation(17.24, 97.8, 203.81, -501.1600928, 257.311, 0, -15.175, 0),
    color: "#90d4d8", visual: { baseColor: "#80c7ce", roughness: 0.73, atmosphereColor: "#a4eff0" },
  },
  {
    id: "neptune", name: "Neptune", kind: "ice-giant",
    description: "A distant ice giant with supersonic winds. Its blue atmosphere and faint rings orbit far from the Sun.",
    meanRadiusKm: 24_622, massKg: 1.02409e26, meanDensityKgM3: 1_638,
    referenceGravityMps2: 11, escapeVelocityKms: 23.5, meanTemperatureC: -200,
    atmosphere: "Hydrogen and helium with methane; methane absorbs red light in the upper atmosphere.",
    orbitalPeriodDays: 60_182, rotation: rotation(16.11, 28.3, 249.978, 541.1397757, 299.36, 0, 43.46, 0),
    color: "#6389e8", visual: { baseColor: "#4168cb", roughness: 0.75, atmosphereColor: "#719dff" },
  },
];

export const PLANETS: PlanetData[] = planetProfiles.map((profile) => {
  const jpl = jplElements[profile.id];
  const meanMotionDegPerDay = (
    jpl.rates.meanLongitudeDegPerCentury - jpl.rates.longitudePerihelionDegPerCentury
  ) / DAYS_PER_JULIAN_CENTURY;
  return {
    ...profile,
    physical: {
      meanRadiusKm: profile.meanRadiusKm,
      meanDiameterKm: profile.meanRadiusKm * 2,
      massKg: profile.massKg,
      meanDensityKgM3: profile.meanDensityKgM3,
      referenceGravityMps2: profile.referenceGravityMps2,
      escapeVelocityKms: profile.escapeVelocityKms,
      meanTemperatureC: profile.meanTemperatureC,
      atmosphere: profile.atmosphere,
    },
    meanDistanceAu: jpl.a,
    eccentricity: jpl.e,
    inclinationDeg: jpl.inclination,
    orbitalElements: {
      semiMajorAxisAu: jpl.a,
      eccentricity: jpl.e,
      inclinationDeg: jpl.inclination,
      longitudeAscendingNodeDeg: jpl.node,
      argumentPerihelionDeg: jpl.longitudePerihelion - jpl.node,
      meanAnomalyAtEpochDeg: jpl.meanLongitude - jpl.longitudePerihelion,
      meanMotionDegPerDay,
      ratesPerCentury: jpl.rates,
    },
    sourceIds: [...commonSources],
    measurementNote: "Physical values are rounded NASA reference values. Mean radius is the adopted volume-mean radius; reference gravity is approximate and gas-giant values use the cited fact-sheet convention.",
  };
});

export const BODIES: CelestialBody[] = [SUN, ...PLANETS];

export function getBody(id: BodyId): CelestialBody | undefined {
  return BODIES.find((body) => body.id === id);
}

export function getPlanet(id: BodyId): PlanetData | undefined {
  return PLANETS.find((planet) => planet.id === id);
}
