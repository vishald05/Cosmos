import {
  calculateInstantaneousDistances,
  calculateLightTravelTime,
  calculateSurfaceSeparationFromDistance,
} from "../../science/distance";
import type {
  InstantaneousDistanceResult,
  LightTravelTimeResult,
  SimulationTime,
  SurfaceSeparationResult,
} from "../../science/distance";
import { DISTANCE_ENDPOINTS } from "./catalogue";
import type { DistanceEndpointOption } from "./catalogue";

export const MAX_JOURNEY_STOPS = DISTANCE_ENDPOINTS.length;

export type JourneyStateResult =
  | { status: "available"; stopIds: readonly string[] }
  | { status: "invalid-input"; reason: string };

export interface JourneySegment {
  index: number;
  start: DistanceEndpointOption;
  destination: DistanceEndpointOption;
  distance: InstantaneousDistanceResult;
  surface: SurfaceSeparationResult;
  lightTravel: LightTravelTimeResult | null;
  simulationTime?: SimulationTime;
}

export interface DistanceJourney {
  status: "complete" | "partial";
  daysSinceJ2000Tdb: number;
  segments: readonly JourneySegment[];
  totalDistanceMetres: number | null;
  availableSegmentDistanceMetres: number;
  totalLightTravelSeconds: number | null;
  availableSegmentLightTravelSeconds: number;
  directDisplacement: InstantaneousDistanceResult;
}

export type DistanceJourneyResult =
  | DistanceJourney
  | { status: "invalid-journey"; reason: string };

const endpointById = new Map(DISTANCE_ENDPOINTS.map((endpoint) => [endpoint.object.id, endpoint]));

function isKnownEndpoint(id: string): boolean {
  return endpointById.has(id);
}

function validateStopIds(stopIds: readonly string[]): string | null {
  if (stopIds.length < 2) return "A journey needs at least a starting object and a destination.";
  if (stopIds.length > MAX_JOURNEY_STOPS) return `A journey can contain at most ${MAX_JOURNEY_STOPS} stops.`;
  if (stopIds.some((id) => !isKnownEndpoint(id))) return "Choose objects from the celestial endpoint catalogue.";
  if (new Set(stopIds).size !== stopIds.length) return "An object can appear only once in a journey.";
  return null;
}

function stateResult(stopIds: readonly string[]): JourneyStateResult {
  const reason = validateStopIds(stopIds);
  return reason ? { status: "invalid-input", reason } : { status: "available", stopIds: [...stopIds] };
}

export function resetJourneyStops(): readonly string[] {
  return ["earth", "mars"];
}

export function addJourneyStop(stopIds: readonly string[], id: string): JourneyStateResult {
  if (!isKnownEndpoint(id)) {
    return { status: "invalid-input", reason: "Choose an object from the celestial endpoint catalogue." };
  }
  if (stopIds.includes(id)) {
    return { status: "invalid-input", reason: "That object is already in this journey." };
  }
  if (stopIds.length >= MAX_JOURNEY_STOPS) {
    return { status: "invalid-input", reason: `A journey can contain at most ${MAX_JOURNEY_STOPS} stops.` };
  }
  return stateResult([...stopIds, id]);
}

export function replaceJourneyStop(
  stopIds: readonly string[],
  index: number,
  id: string,
): JourneyStateResult {
  if (!Number.isInteger(index) || index < 0 || index >= stopIds.length) {
    return { status: "invalid-input", reason: "The selected journey stop does not exist." };
  }
  if (!isKnownEndpoint(id)) {
    return { status: "invalid-input", reason: "Choose an object from the celestial endpoint catalogue." };
  }
  if (stopIds.some((stopId, stopIndex) => stopIndex !== index && stopId === id)) {
    return { status: "invalid-input", reason: "An object can appear only once in a journey." };
  }
  const updated = [...stopIds];
  updated[index] = id;
  return stateResult(updated);
}

export function removeJourneyStop(stopIds: readonly string[], index: number): JourneyStateResult {
  if (!Number.isInteger(index) || index < 0 || index >= stopIds.length) {
    return { status: "invalid-input", reason: "The selected journey stop does not exist." };
  }
  if (stopIds.length <= 2) {
    return { status: "invalid-input", reason: "A journey must keep at least two stops." };
  }
  return stateResult(stopIds.filter((_, stopIndex) => stopIndex !== index));
}

export function moveJourneyStop(
  stopIds: readonly string[],
  fromIndex: number,
  toIndex: number,
): JourneyStateResult {
  if (
    !Number.isInteger(fromIndex)
    || !Number.isInteger(toIndex)
    || fromIndex < 0
    || toIndex < 0
    || fromIndex >= stopIds.length
    || toIndex >= stopIds.length
  ) {
    return { status: "invalid-input", reason: "The requested stop order is invalid." };
  }
  const updated = [...stopIds];
  const [stop] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, stop);
  return stateResult(updated);
}

function sum(values: readonly number[]): number {
  let total = 0;
  let correction = 0;
  for (const value of values) {
    const adjusted = value - correction;
    const next = total + adjusted;
    correction = (next - total) - adjusted;
    total = next;
  }
  return total;
}

export function calculateDistanceJourney(
  stopIds: readonly string[],
  daysSinceJ2000Tdb: number,
): DistanceJourneyResult {
  const validationError = validateStopIds(stopIds);
  if (validationError) return { status: "invalid-journey", reason: validationError };

  const endpoints = stopIds.map((id) => endpointById.get(id)!);
  const consecutivePairs = endpoints.slice(0, -1).map((start, index) => (
    [start.object.id, endpoints[index + 1].object.id] as const
  ));
  const lastEndpoint = endpoints[endpoints.length - 1];
  const distancePairs = endpoints.length === 2
    ? consecutivePairs
    : [...consecutivePairs, [endpoints[0].object.id, lastEndpoint.object.id] as const];
  const distances = calculateInstantaneousDistances(distancePairs, daysSinceJ2000Tdb);
  const segments = endpoints.slice(0, -1).map((start, index): JourneySegment => {
    const destination = endpoints[index + 1];
    const distance = distances[index];
    const surface = calculateSurfaceSeparationFromDistance(distance);
    const lightTravel = distance.status === "available"
      ? calculateLightTravelTime(distance.distanceMetres)
      : null;
    return {
      index,
      start,
      destination,
      distance,
      surface,
      lightTravel,
      ...(distance.simulationTime ? { simulationTime: distance.simulationTime } : {}),
    };
  });

  const availableDistances = segments.flatMap((segment) => (
    segment.distance.status === "available" ? [segment.distance.distanceMetres] : []
  ));
  const availableLightTimes = segments.flatMap((segment) => (
    segment.lightTravel?.status === "available" ? [segment.lightTravel.seconds] : []
  ));
  const isComplete = availableDistances.length === segments.length;
  const allLightTimesAvailable = availableLightTimes.length === segments.length;

  return {
    status: isComplete ? "complete" : "partial",
    daysSinceJ2000Tdb,
    segments,
    totalDistanceMetres: isComplete ? sum(availableDistances) : null,
    availableSegmentDistanceMetres: sum(availableDistances),
    totalLightTravelSeconds: allLightTimesAvailable ? sum(availableLightTimes) : null,
    availableSegmentLightTravelSeconds: sum(availableLightTimes),
    directDisplacement: distances[distances.length - 1],
  };
}
