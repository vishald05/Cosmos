import type { OrbitalElements, Vector3Au } from "./types";
import { PLANETS } from "./planets";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function solveKepler(meanAnomalyRad: number, eccentricity: number, tolerance = 1e-10): number {
  if (!Number.isFinite(meanAnomalyRad)) {
    throw new RangeError("Kepler solver requires a finite mean anomaly.");
  }
  if (!(eccentricity >= 0 && eccentricity < 1)) {
    throw new RangeError("Kepler solver requires an elliptical orbit (0 <= eccentricity < 1).");
  }
  const meanAnomaly = ((meanAnomalyRad + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  let eccentricAnomaly = eccentricity < 0.8 ? meanAnomaly : Math.sign(meanAnomaly || 1) * Math.PI;

  for (let i = 0; i < 30; i += 1) {
    const residual = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;
    const step = residual / (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= step;
    if (Math.abs(step) < tolerance) return eccentricAnomaly;
  }
  throw new Error("Kepler equation solver did not converge within 30 iterations.");
}

export function orbitalPosition(elements: OrbitalElements, daysSinceEpoch: number): Vector3Au {
  const meanAnomaly = (elements.meanAnomalyAtEpochDeg + elements.meanMotionDegPerDay * daysSinceEpoch) * DEG_TO_RAD;
  const eccentricAnomaly = solveKepler(meanAnomaly, elements.eccentricity);
  const a = elements.semiMajorAxisAu;
  const e = elements.eccentricity;
  const xOrbit = a * (Math.cos(eccentricAnomaly) - e);
  const zOrbit = a * Math.sqrt(1 - e * e) * Math.sin(eccentricAnomaly);

  const omega = elements.argumentPerihelionDeg * DEG_TO_RAD;
  const node = elements.longitudeAscendingNodeDeg * DEG_TO_RAD;
  const inclination = elements.inclinationDeg * DEG_TO_RAD;
  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);
  const cosNode = Math.cos(node);
  const sinNode = Math.sin(node);
  const cosInclination = Math.cos(inclination);
  const sinInclination = Math.sin(inclination);

  return {
    x: (cosNode * cosOmega - sinNode * sinOmega * cosInclination) * xOrbit
      + (-cosNode * sinOmega - sinNode * cosOmega * cosInclination) * zOrbit,
    y: sinOmega * sinInclination * xOrbit + cosOmega * sinInclination * zOrbit,
    z: (sinNode * cosOmega + cosNode * sinOmega * cosInclination) * xOrbit
      + (-sinNode * sinOmega + cosNode * cosOmega * cosInclination) * zOrbit,
  };
}

export function orbitPath(elements: OrbitalElements, samples = 240): Vector3Au[] {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const meanAnomalyDeg = (index / samples) * 360;
    return orbitalPosition({ ...elements, meanAnomalyAtEpochDeg: meanAnomalyDeg, meanMotionDegPerDay: 0 }, 0);
  });
}

export function planetaryPositions(daysSinceEpoch: number): Record<string, Vector3Au> {
  return Object.fromEntries(PLANETS.map(({ id, orbitalElements }) => [id, orbitalPosition(orbitalElements, daysSinceEpoch)]));
}

export function trueAnomaly(elements: OrbitalElements, daysSinceEpoch: number): number {
  const meanAnomaly = (elements.meanAnomalyAtEpochDeg + elements.meanMotionDegPerDay * daysSinceEpoch) * DEG_TO_RAD;
  const eccentricAnomaly = solveKepler(meanAnomaly, elements.eccentricity);
  const numerator = Math.sqrt(1 + elements.eccentricity) * Math.sin(eccentricAnomaly / 2);
  const denominator = Math.sqrt(1 - elements.eccentricity) * Math.cos(eccentricAnomaly / 2);
  return (2 * Math.atan2(numerator, denominator)) * RAD_TO_DEG;
}
