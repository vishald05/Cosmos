import { DAYS_PER_JULIAN_CENTURY } from "./planets";
import { normalize, dot } from "./coordinates";
import type { RotationModel, Vector3Au, RotationOrientation } from "./types";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const J2000_OBLIQUITY_DEG = 23.43928;

function equatorialToEcliptic(vector: Vector3Au): Vector3Au {
  const obliquity = J2000_OBLIQUITY_DEG * DEG_TO_RAD;
  return {
    x: vector.x,
    y: Math.cos(obliquity) * vector.y + Math.sin(obliquity) * vector.z,
    z: -Math.sin(obliquity) * vector.y + Math.cos(obliquity) * vector.z,
  };
}

export function rotationAngleDeg(model: RotationModel, daysSinceEpoch: number): number {
  if (!Number.isFinite(daysSinceEpoch)) throw new RangeError("Simulation time must be finite.");
  const angle = model.primeMeridianAtEpochDeg + model.primeMeridianRateDegPerDay * daysSinceEpoch;
  return ((angle % 360) + 360) % 360;
}

export function rotationPeriodDays(model: RotationModel): number {
  const direction = model.direction === "retrograde" ? -1 : 1;
  return direction * model.siderealPeriodHours / 24;
}

export function rotationAtTime(model: RotationModel, daysSinceEpoch: number): RotationOrientation {
  if (!Number.isFinite(daysSinceEpoch)) throw new RangeError("Simulation time must be finite.");
  const centuries = daysSinceEpoch / DAYS_PER_JULIAN_CENTURY;
  const rightAscension = (model.poleRightAscensionDeg + model.poleRightAscensionRateDegPerCentury * centuries) * DEG_TO_RAD;
  const declination = (model.poleDeclinationDeg + model.poleDeclinationRateDegPerCentury * centuries) * DEG_TO_RAD;
  const primeMeridian = rotationAngleDeg(model, daysSinceEpoch) * DEG_TO_RAD;

  const east = equatorialToEcliptic({ x: -Math.sin(rightAscension), y: Math.cos(rightAscension), z: 0 });
  const northTowardEquator = equatorialToEcliptic({
    x: -Math.sin(declination) * Math.cos(rightAscension),
    y: -Math.sin(declination) * Math.sin(rightAscension),
    z: Math.cos(declination),
  });
  const pole = normalize(equatorialToEcliptic({
    x: Math.cos(declination) * Math.cos(rightAscension),
    y: Math.cos(declination) * Math.sin(rightAscension),
    z: Math.sin(declination),
  }));
  const cosine = Math.cos(primeMeridian);
  const sine = Math.sin(primeMeridian);
  const primeMeridianAxis = normalize({
    x: east.x * cosine + northTowardEquator.x * sine,
    y: east.y * cosine + northTowardEquator.y * sine,
    z: east.z * cosine + northTowardEquator.z * sine,
  });
  const equatorialAxis = normalize({
    x: -east.x * sine + northTowardEquator.x * cosine,
    y: -east.y * sine + northTowardEquator.y * cosine,
    z: -east.z * sine + northTowardEquator.z * cosine,
  });

  return { primeMeridianDeg: rotationAngleDeg(model, daysSinceEpoch), pole, primeMeridianAxis, equatorialAxis };
}

export function axialTiltFromPole(pole: Vector3Au, orbitalNormal: Vector3Au): number {
  const cosine = Math.max(-1, Math.min(1, dot(normalize(pole), normalize(orbitalNormal))));
  return Math.acos(cosine) * RAD_TO_DEG;
}

export function rotationDirectionMatchesRate(model: RotationModel): boolean {
  return model.direction === "retrograde"
    ? model.primeMeridianRateDegPerDay < 0
    : model.primeMeridianRateDegPerDay > 0;
}
