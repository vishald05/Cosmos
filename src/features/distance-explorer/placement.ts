import type { SurfaceGapResult, SurfaceSeparationResult } from "../../science/distance";
import { normalizeDimension } from "../scale-lab/engine";
import type { ScaleObject } from "../scale-lab/types";

export type PlacementCalculationType =
  | "spherical-identical-object-placement"
  | "linear-one-dimensional-placement-estimate";

export type PlacementMeasurementMode = "spherical-diameter" | "linear-dimension";

export interface PlacementObjectSource {
  id: string;
  name: string;
  sourceType: "catalogue" | "custom";
  measurementMode: PlacementMeasurementMode;
  dimensionType: ScaleObject["dimensionType"];
  dimensionMetres: number;
  color: string;
}

export interface PlacementSources {
  endpoints?: readonly [
    { id: string; name: string },
    { id: string; name: string },
  ];
  intermediate: PlacementObjectSource;
}

interface PlacementResultBase {
  calculationType: PlacementCalculationType;
  centerDistanceMetres: number;
  endpointRadiiMetres: readonly [number, number];
  availableGapMetres: number;
  intermediateDimensionMetres: number;
  objectCount: bigint;
  remainingMetres: number;
  sources: PlacementSources;
}

export interface AvailablePlacementResult extends PlacementResultBase {
  status: "available";
  endpointRelation: "separated" | "touching";
}

export interface OverlappingPlacementResult extends PlacementResultBase {
  status: "overlapping-endpoints";
  overlapMetres: number;
}

export type PlacementFailure =
  | { status: "unavailable"; reason: string }
  | { status: "invalid-input"; reason: string }
  | { status: "invalid-dimension"; reason: string }
  | { status: "unsupported-measurement-type"; reason: string };

export type PlacementResult =
  | AvailablePlacementResult
  | OverlappingPlacementResult
  | PlacementFailure;

export type PlacementSurfaceResult = SurfaceGapResult | SurfaceSeparationResult;

const FLOAT_FRACTION_BITS = 52n;
const FLOAT_FRACTION_MASK = (1n << FLOAT_FRACTION_BITS) - 1n;
const FLOAT_EXPONENT_MASK = 0x7ffn;

const LINEAR_DIMENSION_TYPES: readonly ScaleObject["dimensionType"][] = [
  "diameter", "height", "width", "length", "custom",
];

function measurementModeFor(object: ScaleObject): PlacementMeasurementMode | null {
  if (object.shape === "sphere" && object.dimensionType === "diameter") return "spherical-diameter";
  if (object.shape === "linear" && LINEAR_DIMENSION_TYPES.includes(object.dimensionType)) return "linear-dimension";
  return null;
}

function normalizePlacementObject(object: ScaleObject):
  | { status: "available"; mode: PlacementMeasurementMode; dimensionMetres: number }
  | { status: "invalid-dimension"; reason: string }
  | { status: "unsupported-measurement-type"; reason: string } {
  if (!object || typeof object !== "object") {
    return { status: "invalid-dimension", reason: "A measured intermediate object is required." };
  }
  let dimensionMetres: number;
  try {
    dimensionMetres = normalizeDimension(object.dimension, object.unit);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return {
      status: "invalid-dimension",
      reason: `The dimension for ${object.name || "the selected object"} is invalid: ${error.message}`,
    };
  }

  const mode = measurementModeFor(object);
  if (!mode) {
    return {
      status: "unsupported-measurement-type",
      reason: "Placement requires a spherical diameter or a supported one-dimensional measurement.",
    };
  }
  return { status: "available", mode, dimensionMetres };
}

export function isPlacementObjectEligible(object: ScaleObject): boolean {
  return normalizePlacementObject(object).status === "available";
}

function sourcesFor(
  surface: PlacementSurfaceResult,
  object: ScaleObject,
  mode: PlacementMeasurementMode,
  dimensionMetres: number,
): PlacementSources {
  const endpointSources = "sourceObjects" in surface ? surface.sourceObjects : undefined;
  return {
    ...(endpointSources ? {
      endpoints: [
        { id: endpointSources[0].id, name: endpointSources[0].name },
        { id: endpointSources[1].id, name: endpointSources[1].name },
      ] as const,
    } : {}),
    intermediate: {
      id: object.id,
      name: object.name,
      sourceType: object.builtIn ? "catalogue" : "custom",
      measurementMode: mode,
      dimensionType: object.dimensionType,
      dimensionMetres,
      color: object.color,
    },
  };
}

function failure(status: PlacementFailure["status"], reason: string): PlacementFailure {
  return { status, reason };
}

function binaryComponents(value: number): { significand: bigint; exponent: number } {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, false);
  const bits = view.getBigUint64(0, false);
  const encodedExponent = Number((bits >> FLOAT_FRACTION_BITS) & FLOAT_EXPONENT_MASK);
  const fraction = bits & FLOAT_FRACTION_MASK;
  if (encodedExponent === 0) return { significand: fraction, exponent: -1_074 };
  return {
    significand: (1n << FLOAT_FRACTION_BITS) | fraction,
    exponent: encodedExponent - 1_023 - Number(FLOAT_FRACTION_BITS),
  };
}

function exactObjectCountAndRemainder(
  gapMetres: number,
  dimensionMetres: number,
): { objectCount: bigint; remainingMetres: number } {
  if (gapMetres === 0) return { objectCount: 0n, remainingMetres: 0 };
  const gap = binaryComponents(gapMetres);
  const dimension = binaryComponents(dimensionMetres);
  const exponentDifference = gap.exponent - dimension.exponent;

  if (exponentDifference >= 0) {
    const scaledGap = gap.significand << BigInt(exponentDifference);
    const objectCount = scaledGap / dimension.significand;
    const remainder = scaledGap % dimension.significand;
    return {
      objectCount,
      remainingMetres: Number(remainder) * 2 ** dimension.exponent,
    };
  }

  const scaledDimension = dimension.significand << BigInt(-exponentDifference);
  const objectCount = gap.significand / scaledDimension;
  const remainder = gap.significand % scaledDimension;
  return {
    objectCount,
    remainingMetres: Number(remainder) * 2 ** gap.exponent,
  };
}

export function calculateObjectPlacement(
  surface: PlacementSurfaceResult,
  object: ScaleObject,
): PlacementResult {
  if (surface.status !== "available") return failure(surface.status, surface.reason);

  const measuredObject = normalizePlacementObject(object);
  if (measuredObject.status !== "available") {
    return failure(measuredObject.status, measuredObject.reason);
  }

  const {
    centerDistanceMetres,
    radiusAMetres,
    radiusBMetres,
    availableSurfaceGapMetres,
    overlapMetres,
  } = surface;
  if (
    ![centerDistanceMetres, radiusAMetres, radiusBMetres, availableSurfaceGapMetres].every(Number.isFinite)
    || centerDistanceMetres < 0
    || radiusAMetres <= 0
    || radiusBMetres <= 0
    || availableSurfaceGapMetres < 0
  ) {
    return failure("invalid-input", "The Phase 4.2 surface-separation result has invalid distance or endpoint dimensions.");
  }
  if (surface.relation === "overlapping" && (!Number.isFinite(overlapMetres) || overlapMetres <= 0)) {
    return failure("invalid-input", "The overlapping endpoint result has an invalid overlap distance.");
  }

  const calculationType: PlacementCalculationType = measuredObject.mode === "spherical-diameter"
    ? "spherical-identical-object-placement"
    : "linear-one-dimensional-placement-estimate";
  const sources = sourcesFor(surface, object, measuredObject.mode, measuredObject.dimensionMetres);
  const endpointRadiiMetres = [radiusAMetres, radiusBMetres] as const;

  if (surface.relation === "overlapping") {
    return {
      status: "overlapping-endpoints",
      calculationType,
      centerDistanceMetres,
      endpointRadiiMetres,
      availableGapMetres: 0,
      intermediateDimensionMetres: measuredObject.dimensionMetres,
      objectCount: 0n,
      remainingMetres: 0,
      overlapMetres,
      sources,
    };
  }
  if (surface.relation !== "separated" && surface.relation !== "touching") {
    return failure("invalid-input", "The Phase 4.2 surface-separation relation is unsupported.");
  }

  const { objectCount, remainingMetres } = exactObjectCountAndRemainder(
    availableSurfaceGapMetres,
    measuredObject.dimensionMetres,
  );
  return {
    status: "available",
    calculationType,
    centerDistanceMetres,
    endpointRadiiMetres,
    availableGapMetres: availableSurfaceGapMetres,
    intermediateDimensionMetres: measuredObject.dimensionMetres,
    objectCount,
    remainingMetres,
    endpointRelation: surface.relation,
    sources,
  };
}
