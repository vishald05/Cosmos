import { DAYS_PER_JULIAN_CENTURY, PLANETS } from "./planets";
import type { OrbitalElements, PlanetId, Vector3Au } from "./types";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const TWO_PI = 2 * Math.PI;

export function solveKepler(meanAnomalyRad: number, eccentricity: number, tolerance = 1e-12): number {
  if (!Number.isFinite(meanAnomalyRad)) {
    throw new RangeError("Kepler solver requires a finite mean anomaly.");
  }
  if (!Number.isFinite(eccentricity) || eccentricity < 0 || eccentricity >= 1) {
    throw new RangeError("Kepler solver requires an elliptical orbit (0 <= eccentricity < 1).");
  }
  if (!(tolerance > 0) || !Number.isFinite(tolerance)) {
    throw new RangeError("Kepler solver tolerance must be finite and positive.");
  }

  const meanAnomaly = ((meanAnomalyRad + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
  let eccentricAnomaly = eccentricity < 0.8
    ? meanAnomaly
    : Math.sign(meanAnomaly || 1) * Math.PI;

  for (let iteration = 0; iteration < 50; iteration += 1) {
    const residual = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;
    const derivative = 1 - eccentricity * Math.cos(eccentricAnomaly);
    const correction = residual / derivative;
    eccentricAnomaly -= correction;
    if (Math.abs(correction) <= tolerance) return eccentricAnomaly;
  }
  throw new Error("Kepler equation solver did not converge within 50 iterations.");
}

export interface PropagatedElements {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  longitudeAscendingNodeDeg: number;
  argumentPerihelionDeg: number;
  meanAnomalyDeg: number;
}

function planePositionAt(current: PropagatedElements): { x: number; y: number } {
  const eccentricAnomaly = solveKepler(current.meanAnomalyDeg * DEG_TO_RAD, current.eccentricity);
  return {
    x: current.semiMajorAxisAu * (Math.cos(eccentricAnomaly) - current.eccentricity),
    y: current.semiMajorAxisAu * Math.sqrt(1 - current.eccentricity ** 2) * Math.sin(eccentricAnomaly),
  };
}

export function elementsAt(elements: OrbitalElements, daysSinceEpoch: number): PropagatedElements {
  if (!Number.isFinite(daysSinceEpoch)) throw new RangeError("Simulation time must be finite.");
  const centuries = daysSinceEpoch / DAYS_PER_JULIAN_CENTURY;
  const rates = elements.ratesPerCentury;
  const longitudePerihelionRate = rates.longitudePerihelionDegPerCentury;
  const nodeRate = rates.longitudeAscendingNodeDegPerCentury;

  return {
    semiMajorAxisAu: elements.semiMajorAxisAu + rates.semiMajorAxisAuPerCentury * centuries,
    eccentricity: elements.eccentricity + rates.eccentricityPerCentury * centuries,
    inclinationDeg: elements.inclinationDeg + rates.inclinationDegPerCentury * centuries,
    longitudeAscendingNodeDeg: elements.longitudeAscendingNodeDeg + nodeRate * centuries,
    argumentPerihelionDeg: elements.argumentPerihelionDeg + (longitudePerihelionRate - nodeRate) * centuries,
    meanAnomalyDeg: elements.meanAnomalyAtEpochDeg + elements.meanMotionDegPerDay * daysSinceEpoch,
  };
}

export function orbitalRadiusAu(elements: OrbitalElements, daysSinceEpoch: number): number {
  const current = elementsAt(elements, daysSinceEpoch);
  const eccentricAnomaly = solveKepler(current.meanAnomalyDeg * DEG_TO_RAD, current.eccentricity);
  return current.semiMajorAxisAu * (1 - current.eccentricity * Math.cos(eccentricAnomaly));
}

export function orbitalPlanePosition(elements: OrbitalElements, daysSinceEpoch: number): { x: number; y: number } {
  return planePositionAt(elementsAt(elements, daysSinceEpoch));
}

export function orbitalPosition(elements: OrbitalElements, daysSinceEpoch: number): Vector3Au {
  const current = elementsAt(elements, daysSinceEpoch);
  const { x: xOrbit, y: yOrbit } = planePositionAt(current);
  const omega = current.argumentPerihelionDeg * DEG_TO_RAD;
  const node = current.longitudeAscendingNodeDeg * DEG_TO_RAD;
  const inclination = current.inclinationDeg * DEG_TO_RAD;
  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);
  const cosNode = Math.cos(node);
  const sinNode = Math.sin(node);
  const cosInclination = Math.cos(inclination);
  const sinInclination = Math.sin(inclination);

  return {
    x: (cosOmega * cosNode - sinOmega * sinNode * cosInclination) * xOrbit
      + (-sinOmega * cosNode - cosOmega * sinNode * cosInclination) * yOrbit,
    y: (cosOmega * sinNode + sinOmega * cosNode * cosInclination) * xOrbit
      + (-sinOmega * sinNode + cosOmega * cosNode * cosInclination) * yOrbit,
    z: sinOmega * sinInclination * xOrbit + cosOmega * sinInclination * yOrbit,
  };
}

export function orbitalNormal(elements: OrbitalElements, daysSinceEpoch: number): Vector3Au {
  const current = elementsAt(elements, daysSinceEpoch);
  const inclination = current.inclinationDeg * DEG_TO_RAD;
  const node = current.longitudeAscendingNodeDeg * DEG_TO_RAD;
  return {
    x: Math.sin(node) * Math.sin(inclination),
    y: -Math.cos(node) * Math.sin(inclination),
    z: Math.cos(inclination),
  };
}

export function orbitPath(elements: OrbitalElements, samples = 240): Vector3Au[] {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const meanAnomalyDeg = (index / samples) * 360;
    return orbitalPosition({ ...elements, meanAnomalyAtEpochDeg: meanAnomalyDeg }, 0);
  });
}

export function planetaryPositions(daysSinceEpoch: number): Record<PlanetId, Vector3Au> {
  return PLANETS.reduce((positions, planet) => {
    positions[planet.id] = orbitalPosition(planet.orbitalElements, daysSinceEpoch);
    return positions;
  }, {} as Record<PlanetId, Vector3Au>);
}

export function trueAnomaly(elements: OrbitalElements, daysSinceEpoch: number): number {
  const current = elementsAt(elements, daysSinceEpoch);
  const eccentricAnomaly = solveKepler(current.meanAnomalyDeg * DEG_TO_RAD, current.eccentricity);
  const numerator = Math.sqrt(1 + current.eccentricity) * Math.sin(eccentricAnomaly / 2);
  const denominator = Math.sqrt(1 - current.eccentricity) * Math.cos(eccentricAnomaly / 2);
  return 2 * Math.atan2(numerator, denominator) * RAD_TO_DEG;
}

export function normalizeDegrees(angle: number): number {
  return ((angle % 360) + 360) % 360;
}
