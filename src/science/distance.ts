import { BODIES, PLANETS, SUN } from "./planets";
import type { BodyId, PlanetId, Vector3Au } from "./types";
import { planetaryPositions } from "./orbit";
import { AU_IN_KM, simulationDate } from "./units";

export const DISTANCE_UNITS = ["m", "km", "mi", "AU"] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export const METRES_PER_AU = AU_IN_KM * 1_000;
export const METRES_PER_MILE = 1_609.344;
export const SPEED_OF_LIGHT_METRES_PER_SECOND = 299_792_458;
export const SECONDS_PER_JULIAN_YEAR = 365.25 * 86_400;

const METRES_PER_UNIT: Readonly<Record<DistanceUnit, number>> = {
  m: 1,
  km: 1_000,
  mi: METRES_PER_MILE,
  AU: METRES_PER_AU,
};

const MIN_ORBIT_MODEL_YEAR = 1800;
const MAX_ORBIT_MODEL_YEAR = 2050;
const DISTANCE_FRAME = "heliocentric ecliptic J2000";

export interface SimulationTime {
  daysSinceJ2000Tdb: number;
  displayDateIso: string;
}

export type CalculationFailure = {
  status: "unavailable" | "invalid-input";
  reason: string;
};

export type DistancePositionResult =
  | {
    status: "available";
    objectId: string;
    objectName: string;
    positionAu: Vector3Au;
    positionSource: "heliocentric-origin" | "jpl-secular-elements";
  }
  | (CalculationFailure & { objectId: string });

export type PositionDistanceResult =
  | { status: "available"; distanceMetres: number; unit: "m" }
  | CalculationFailure;

export interface DistanceSourceObject {
  id: string;
  name: string;
  positionAu: Vector3Au;
}

export type InstantaneousDistanceResult =
  | {
    status: "available";
    calculationType: "instantaneous-center-to-center";
    distanceMetres: number;
    distanceAu: number;
    unit: "m";
    referenceFrame: typeof DISTANCE_FRAME;
    simulationTime: SimulationTime;
    sourceObjects: readonly [DistanceSourceObject, DistanceSourceObject];
  }
  | (CalculationFailure & {
    calculationType: "instantaneous-center-to-center";
    objectIds: readonly [string, string];
    simulationTime?: SimulationTime;
  });

export type SurfaceGapResult =
  | {
    status: "available";
    centerDistanceMetres: number;
    radiusAMetres: number;
    radiusBMetres: number;
    signedSurfaceGapMetres: number;
    availableSurfaceGapMetres: number;
    overlapMetres: number;
    relation: "separated" | "touching" | "overlapping";
  }
  | CalculationFailure;

export type SurfaceSeparationResult =
  | {
    status: "available";
    calculationType: "instantaneous-surface-to-surface";
    centerDistanceMetres: number;
    radiusAMetres: number;
    radiusBMetres: number;
    signedSurfaceGapMetres: number;
    availableSurfaceGapMetres: number;
    overlapMetres: number;
    relation: "separated" | "touching" | "overlapping";
    unit: "m";
    referenceFrame: typeof DISTANCE_FRAME;
    simulationTime: SimulationTime;
    sourceObjects: readonly [DistanceSourceObject, DistanceSourceObject];
  }
  | (CalculationFailure & {
    calculationType: "instantaneous-surface-to-surface";
    objectIds: readonly [string, string];
    simulationTime?: SimulationTime;
  });

export interface LightTravelTime {
  status: "available";
  calculationType: "vacuum-light-travel-time";
  distanceMetres: number;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
  julianYears: number;
  model: "constant speed of light in vacuum; no relativistic or medium effects";
}

export type LightTravelTimeResult = LightTravelTime | (CalculationFailure & {
  calculationType: "vacuum-light-travel-time";
});

export interface OrbitalAverageUnavailable {
  status: "unavailable";
  measurementType: "orbital-average-distance";
  objectIds: readonly [string, string];
  reason: string;
}

function unitFactor(unit: DistanceUnit): number {
  const factor = METRES_PER_UNIT[unit];
  if (typeof factor !== "number") throw new RangeError(`Unsupported distance unit: ${String(unit)}.`);
  return factor;
}

function validateNonNegativeDistance(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite distance greater than or equal to zero.`);
  }
}

export function distanceToMetres(value: number, unit: DistanceUnit): number {
  validateNonNegativeDistance(value, "Distance");
  const metres = value * unitFactor(unit);
  if (!Number.isFinite(metres)) throw new RangeError("Distance is outside the supported numeric range.");
  return metres;
}

export function convertDistance(value: number, from: DistanceUnit, to: DistanceUnit): number {
  const metres = distanceToMetres(value, from);
  const converted = metres / unitFactor(to);
  if (!Number.isFinite(converted)) throw new RangeError("Converted distance is outside the supported numeric range.");
  return converted;
}

function validateSimulationTime(daysSinceJ2000Tdb: number):
  | { status: "available"; value: SimulationTime }
  | CalculationFailure {
  if (!Number.isFinite(daysSinceJ2000Tdb)) {
    return { status: "invalid-input", reason: "Simulation time must be a finite number of days since J2000 TDB." };
  }
  const date = simulationDate(daysSinceJ2000Tdb);
  if (!Number.isFinite(date.getTime())) {
    return { status: "invalid-input", reason: "Simulation time is outside the supported date range." };
  }
  const year = date.getUTCFullYear();
  if (year < MIN_ORBIT_MODEL_YEAR || year > MAX_ORBIT_MODEL_YEAR) {
    return {
      status: "unavailable",
      reason: `The JPL secular-element model is intended for ${MIN_ORBIT_MODEL_YEAR}–${MAX_ORBIT_MODEL_YEAR}; no position is reported outside that range.`,
    };
  }
  return {
    status: "available",
    value: { daysSinceJ2000Tdb, displayDateIso: date.toISOString() },
  };
}

function findPositionSource(objectId: string):
  | { status: "available"; id: BodyId; name: string }
  | CalculationFailure {
  if (objectId === SUN.id) return { status: "available", id: SUN.id, name: SUN.name };
  const planet = PLANETS.find((candidate) => candidate.id === objectId);
  if (planet) return { status: "available", id: planet.id, name: planet.name };
  if (objectId === "moon") {
    return {
      status: "unavailable",
      reason: "The Moon has no supported lunar position model in the current science engine.",
    };
  }
  if (objectId.startsWith("custom-")) {
    return {
      status: "unavailable",
      reason: "Custom objects provide dimensions only and have no celestial position.",
    };
  }
  return { status: "unavailable", reason: `No astronomical position model is available for "${objectId}".` };
}

function isFinitePosition(position: Vector3Au): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z);
}

type PositionsAtTime = Partial<Record<PlanetId, Vector3Au>>;

function positionFromModel(
  objectId: string,
  positions: PositionsAtTime,
): DistancePositionResult {
  const source = findPositionSource(objectId);
  if (source.status !== "available") return { ...source, objectId };
  if (source.id === "sun") {
    return {
      status: "available",
      objectId,
      objectName: source.name,
      positionAu: { x: 0, y: 0, z: 0 },
      positionSource: "heliocentric-origin",
    };
  }
  const positionAu = positions[source.id];
  if (!positionAu || !isFinitePosition(positionAu)) {
    return { status: "invalid-input", objectId, reason: `The orbital model returned non-finite coordinates for ${source.name}.` };
  }
  return {
    status: "available",
    objectId,
    objectName: source.name,
    positionAu,
    positionSource: "jpl-secular-elements",
  };
}

export function getCelestialPosition(objectId: string, daysSinceJ2000Tdb: number): DistancePositionResult {
  const time = validateSimulationTime(daysSinceJ2000Tdb);
  if (time.status !== "available") return { ...time, objectId };
  const source = findPositionSource(objectId);
  if (source.status !== "available") return { ...source, objectId };
  if (source.id === "sun") {
    return {
      status: "available",
      objectId,
      objectName: source.name,
      positionAu: { x: 0, y: 0, z: 0 },
      positionSource: "heliocentric-origin",
    };
  }

  try {
    return positionFromModel(objectId, planetaryPositions(daysSinceJ2000Tdb));
  } catch (error) {
    return {
      status: "unavailable",
      objectId,
      reason: `The existing orbital model could not produce a position: ${error instanceof Error ? error.message : "unknown model error"}`,
    };
  }
}

export function calculatePositionDistance(positionA: Vector3Au, positionB: Vector3Au): PositionDistanceResult {
  if (!positionA || !positionB || !isFinitePosition(positionA) || !isFinitePosition(positionB)) {
    return { status: "invalid-input", reason: "Both positions must contain finite ecliptic J2000 coordinates in AU." };
  }
  const dxMetres = (positionB.x - positionA.x) * METRES_PER_AU;
  const dyMetres = (positionB.y - positionA.y) * METRES_PER_AU;
  const dzMetres = (positionB.z - positionA.z) * METRES_PER_AU;
  const distanceMetres = Math.hypot(dxMetres, dyMetres, dzMetres);
  if (!Number.isFinite(distanceMetres)) {
    return { status: "invalid-input", reason: "The distance between positions is outside the supported numeric range." };
  }
  return { status: "available", distanceMetres, unit: "m" };
}

function failureForInstantaneous(
  result: CalculationFailure,
  objectIds: readonly [string, string],
  simulationTime?: SimulationTime,
): InstantaneousDistanceResult {
  return {
    ...result,
    calculationType: "instantaneous-center-to-center",
    objectIds,
    ...(simulationTime ? { simulationTime } : {}),
  };
}

export function calculateInstantaneousDistance(
  objectAId: string,
  objectBId: string,
  daysSinceJ2000Tdb: number,
): InstantaneousDistanceResult {
  return calculateInstantaneousDistances([[objectAId, objectBId]], daysSinceJ2000Tdb)[0];
}

export function calculateInstantaneousDistances(
  objectPairs: readonly (readonly [string, string])[],
  daysSinceJ2000Tdb: number,
): InstantaneousDistanceResult[] {
  if (objectPairs.length === 0) return [];
  const time = validateSimulationTime(daysSinceJ2000Tdb);
  if (time.status !== "available") {
    return objectPairs.map((objectIds) => failureForInstantaneous(time, objectIds));
  }

  const resolvedPairs = objectPairs.map(([objectAId, objectBId]) => ({
    objectIds: [objectAId, objectBId] as const,
    sourceA: findPositionSource(objectAId),
    sourceB: findPositionSource(objectBId),
  }));
  const needsPlanetaryPositions = resolvedPairs.some(({ sourceA, sourceB }) => (
    sourceA.status === "available"
    && sourceB.status === "available"
    && (sourceA.id !== "sun" || sourceB.id !== "sun")
  ));
  let positions: PositionsAtTime = {};
  let positionFailure: CalculationFailure | null = null;
  if (needsPlanetaryPositions) {
    try {
      positions = planetaryPositions(daysSinceJ2000Tdb);
    } catch (error) {
      positionFailure = {
      status: "unavailable",
      reason: `The existing orbital model could not produce positions: ${error instanceof Error ? error.message : "unknown model error"}`,
      };
    }
  }
  const positionCache = new Map<string, DistancePositionResult>();
  const positionFor = (objectId: string): DistancePositionResult => {
    const cached = positionCache.get(objectId);
    if (cached) return cached;
    const position = positionFromModel(objectId, positions);
    positionCache.set(objectId, position);
    return position;
  };

  return resolvedPairs.map(({ objectIds, sourceA, sourceB }) => {
    if (sourceA.status !== "available") {
      return failureForInstantaneous(sourceA, objectIds, time.value);
    }
    if (sourceB.status !== "available") {
      return failureForInstantaneous(sourceB, objectIds, time.value);
    }
    if (positionFailure && (sourceA.id !== "sun" || sourceB.id !== "sun")) {
      return failureForInstantaneous(positionFailure, objectIds, time.value);
    }
    const positionA = positionFor(objectIds[0]);
    if (positionA.status !== "available") {
      return failureForInstantaneous(positionA, objectIds, time.value);
    }
    const positionB = positionFor(objectIds[1]);
    if (positionB.status !== "available") {
      return failureForInstantaneous(positionB, objectIds, time.value);
    }
    const geometry = calculatePositionDistance(positionA.positionAu, positionB.positionAu);
    if (geometry.status !== "available") {
      return failureForInstantaneous(geometry, objectIds, time.value);
    }

    return {
      status: "available",
      calculationType: "instantaneous-center-to-center",
      distanceMetres: geometry.distanceMetres,
      distanceAu: geometry.distanceMetres / METRES_PER_AU,
      unit: "m",
      referenceFrame: DISTANCE_FRAME,
      simulationTime: time.value,
      sourceObjects: [
      { id: objectIds[0], name: positionA.objectName, positionAu: positionA.positionAu },
      { id: objectIds[1], name: positionB.objectName, positionAu: positionB.positionAu },
      ],
    };
  });
}

export function calculateSurfaceGap(
  centerDistanceMetres: number,
  radiusAMetres: number | undefined,
  radiusBMetres: number | undefined,
): SurfaceGapResult {
  if (!Number.isFinite(centerDistanceMetres) || centerDistanceMetres < 0) {
    return { status: "invalid-input", reason: "Center distance must be finite and non-negative." };
  }
  if (radiusAMetres === undefined || radiusBMetres === undefined) {
    return { status: "unavailable", reason: "Mean physical radii are required for both endpoints." };
  }
  if (![radiusAMetres, radiusBMetres].every((radius) => Number.isFinite(radius) && radius > 0)) {
    return { status: "invalid-input", reason: "Both mean physical radii must be finite and greater than zero." };
  }
  const radiusSum = radiusAMetres + radiusBMetres;
  if (!Number.isFinite(radiusSum)) {
    return { status: "invalid-input", reason: "The combined endpoint radii are outside the supported numeric range." };
  }
  const signedSurfaceGapMetres = centerDistanceMetres - radiusSum;
  const relation = signedSurfaceGapMetres < 0
    ? "overlapping"
    : signedSurfaceGapMetres === 0 ? "touching" : "separated";
  return {
    status: "available",
    centerDistanceMetres,
    radiusAMetres,
    radiusBMetres,
    signedSurfaceGapMetres,
    availableSurfaceGapMetres: Math.max(0, signedSurfaceGapMetres),
    overlapMetres: Math.max(0, -signedSurfaceGapMetres),
    relation,
  };
}

function failureForSurface(
  result: CalculationFailure,
  objectIds: readonly [string, string],
  simulationTime?: SimulationTime,
): SurfaceSeparationResult {
  return {
    ...result,
    calculationType: "instantaneous-surface-to-surface",
    objectIds,
    ...(simulationTime ? { simulationTime } : {}),
  };
}

export function calculateSurfaceSeparationFromDistance(
  center: InstantaneousDistanceResult,
): SurfaceSeparationResult {
  const objectIds: readonly [string, string] = center.status === "available"
    ? [center.sourceObjects[0].id, center.sourceObjects[1].id]
    : center.objectIds;
  if (center.status !== "available") {
    return failureForSurface(center, objectIds, center.simulationTime);
  }

  const bodyA = BODIES.find(({ id }) => id === objectIds[0]);
  const bodyB = BODIES.find(({ id }) => id === objectIds[1]);
  if (!bodyA || !bodyB) {
    return failureForSurface({
      status: "unavailable",
      reason: "Physical mean-radius data is unavailable for one or both endpoints.",
    }, objectIds, center.simulationTime);
  }
  const gap = calculateSurfaceGap(
    center.distanceMetres,
    bodyA.physical.meanRadiusKm * 1_000,
    bodyB.physical.meanRadiusKm * 1_000,
  );
  if (gap.status !== "available") return failureForSurface(gap, objectIds, center.simulationTime);
  return {
    calculationType: "instantaneous-surface-to-surface",
    ...gap,
    unit: "m",
    referenceFrame: DISTANCE_FRAME,
    simulationTime: center.simulationTime,
    sourceObjects: center.sourceObjects,
  };
}

export function calculateInstantaneousSurfaceSeparation(
  objectAId: string,
  objectBId: string,
  daysSinceJ2000Tdb: number,
): SurfaceSeparationResult {
  const center = calculateInstantaneousDistance(objectAId, objectBId, daysSinceJ2000Tdb);
  return calculateSurfaceSeparationFromDistance(center);
}

export function calculateLightTravelTime(distanceMetres: number): LightTravelTimeResult {
  if (!Number.isFinite(distanceMetres) || distanceMetres < 0) {
    return {
      status: "invalid-input",
      calculationType: "vacuum-light-travel-time",
      reason: "Distance must be finite and non-negative.",
    };
  }
  const seconds = distanceMetres / SPEED_OF_LIGHT_METRES_PER_SECOND;
  return {
    status: "available",
    calculationType: "vacuum-light-travel-time",
    distanceMetres,
    seconds,
    minutes: seconds / 60,
    hours: seconds / 3_600,
    days: seconds / 86_400,
    julianYears: seconds / SECONDS_PER_JULIAN_YEAR,
    model: "constant speed of light in vacuum; no relativistic or medium effects",
  };
}

export function orbitalAverageDistanceUnavailable(
  objectAId: string,
  objectBId: string,
): OrbitalAverageUnavailable {
  return {
    status: "unavailable",
    measurementType: "orbital-average-distance",
    objectIds: [objectAId, objectBId],
    reason: "No statistically defined orbital-average separation is supported by the current scientific data.",
  };
}
