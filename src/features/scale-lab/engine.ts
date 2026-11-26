import type {
  ComparisonLayout, MeasurementUnit, NormalizedScaleObject, ScaleObject,
} from "./types";

export const MIN_DIMENSION_METRES = 1e-12;
export const MAX_DIMENSION_METRES = 1e18;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 40;

const METRES_PER_UNIT: Record<MeasurementUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1_000,
  in: 0.0254,
  ft: 0.3048,
  mi: 1_609.344,
};

function assertFinitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a finite value greater than zero.`);
  }
}

function metresPerUnit(unit: MeasurementUnit): number {
  const factor = METRES_PER_UNIT[unit];
  if (!factor) throw new RangeError(`Unsupported measurement unit: ${String(unit)}.`);
  return factor;
}

export function normalizeDimension(value: number, unit: MeasurementUnit): number {
  assertFinitePositive(value, "Dimension");
  const metres = value * metresPerUnit(unit);
  if (!Number.isFinite(metres) || metres < MIN_DIMENSION_METRES || metres > MAX_DIMENSION_METRES) {
    throw new RangeError(`Dimension must be between ${MIN_DIMENSION_METRES} and ${MAX_DIMENSION_METRES} metres.`);
  }
  return metres;
}

export function convertMeasurement(value: number, from: MeasurementUnit, to: MeasurementUnit): number {
  const metres = normalizeDimension(value, from);
  const converted = metres / metresPerUnit(to);
  if (!Number.isFinite(converted)) throw new RangeError("Converted dimension is outside the supported numeric range.");
  return converted;
}

export function normalizeScaleObject(object: ScaleObject): NormalizedScaleObject {
  if (!object || typeof object !== "object") throw new RangeError("A comparison object is required.");
  return { ...object, dimensionMetres: normalizeDimension(object.dimension, object.unit) };
}

export interface DimensionalComparison {
  dimensionAMetres: number;
  dimensionBMetres: number;
  absoluteDifferenceMetres: number;
  ratioAtoB: number;
  percentageDifference: number;
  percentageSmaller: number;
  largerId: string;
  smallerId: string;
}

export function compareDimensions(a: ScaleObject, b: ScaleObject): DimensionalComparison {
  if (!a || !b) throw new RangeError("Both comparison objects are required.");
  const dimensionAMetres = normalizeDimension(a.dimension, a.unit);
  const dimensionBMetres = normalizeDimension(b.dimension, b.unit);
  const larger = dimensionAMetres >= dimensionBMetres ? a : b;
  const smaller = dimensionAMetres >= dimensionBMetres ? b : a;
  const largerDimension = Math.max(dimensionAMetres, dimensionBMetres);
  const smallerDimension = Math.min(dimensionAMetres, dimensionBMetres);
  return {
    dimensionAMetres,
    dimensionBMetres,
    absoluteDifferenceMetres: largerDimension - smallerDimension,
    ratioAtoB: dimensionAMetres / dimensionBMetres,
    percentageDifference: ((largerDimension - smallerDimension) / smallerDimension) * 100,
    percentageSmaller: ((largerDimension - smallerDimension) / largerDimension) * 100,
    largerId: larger.id,
    smallerId: smaller.id,
  };
}

export function sphereVolumeM3(diameterMetres: number): number {
  assertFinitePositive(diameterMetres, "Sphere diameter");
  if (diameterMetres < MIN_DIMENSION_METRES || diameterMetres > MAX_DIMENSION_METRES) {
    throw new RangeError("Sphere diameter is outside the supported numeric range.");
  }
  const radius = diameterMetres / 2;
  const volume = (4 / 3) * Math.PI * radius ** 3;
  if (!Number.isFinite(volume)) throw new RangeError("Sphere volume is outside the supported numeric range.");
  return volume;
}

export type VolumeComparison =
  | { available: false; reason: string }
  | {
    available: true;
    approximate: boolean;
    volumeAM3: number;
    volumeBM3: number;
    ratioAtoB: number;
    largerId: string;
    smallerId: string;
  };

export function compareSphericalVolumes(
  a: ScaleObject,
  b: ScaleObject,
  allowSphericalApproximation = false,
): VolumeComparison {
  if (!a || !b) throw new RangeError("Both comparison objects are required.");
  const aIsMeasuredSphere = a.shape === "sphere" && a.dimensionType === "diameter";
  const bIsMeasuredSphere = b.shape === "sphere" && b.dimensionType === "diameter";
  if ((!aIsMeasuredSphere || !bIsMeasuredSphere) && !allowSphericalApproximation) {
    return {
      available: false,
      reason: "Volume is available only for spherical diameters. Enable an equivalent-sphere estimate to approximate a linear dimension.",
    };
  }

  const diameterAMetres = normalizeDimension(a.dimension, a.unit);
  const diameterBMetres = normalizeDimension(b.dimension, b.unit);
  const volumeAM3 = sphereVolumeM3(diameterAMetres);
  const volumeBM3 = sphereVolumeM3(diameterBMetres);
  const aIsApproximate = !aIsMeasuredSphere || Boolean(a.approximationNote);
  const bIsApproximate = !bIsMeasuredSphere || Boolean(b.approximationNote);
  return {
    available: true,
    approximate: aIsApproximate || bIsApproximate
      || (allowSphericalApproximation && (!aIsMeasuredSphere || !bIsMeasuredSphere)),
    volumeAM3,
    volumeBM3,
    ratioAtoB: volumeAM3 / volumeBM3,
    largerId: volumeAM3 >= volumeBM3 ? a.id : b.id,
    smallerId: volumeAM3 >= volumeBM3 ? b.id : a.id,
  };
}

export interface VisualDimension {
  id: string;
  dimensionMetres: number;
  centerX: number;
  centerY: number;
  dimensionPixels: number;
  visibleInPrimaryScale: boolean;
}

export interface SharedScaleLayout {
  width: number;
  height: number;
  scaleFactor: number;
  baselineY: number;
  dimensions: VisualDimension[];
  belowResolutionIds: string[];
}

export function calculateSharedScaleFactor(
  dimensionsMetres: readonly number[],
  width: number,
  height: number,
  zoom = 1,
): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError("Visualization viewport dimensions must be finite and positive.");
  }
  if (!Number.isFinite(zoom) || zoom < MIN_ZOOM || zoom > MAX_ZOOM) {
    throw new RangeError(`Zoom must be between ${MIN_ZOOM} and ${MAX_ZOOM}.`);
  }
  if (dimensionsMetres.length === 0) return 0;
  dimensionsMetres.forEach((dimension) => {
    if (!Number.isFinite(dimension) || dimension < MIN_DIMENSION_METRES || dimension > MAX_DIMENSION_METRES) {
      throw new RangeError("Visualization dimensions must be finite, positive, and within the supported range.");
    }
  });

  const maximumDimension = Math.max(...dimensionsMetres);
  const horizontalMargin = Math.min(42, width * 0.08);
  const gap = Math.min(18, width * 0.025) * Math.max(0, dimensionsMetres.length - 1);
  const slotWidth = (width - 2 * horizontalMargin - gap) / dimensionsMetres.length;
  const availableHeight = Math.max(0, height - 108);
  const maximumPixelDimension = Math.min(slotWidth * 0.82, availableHeight * 0.7);
  if (maximumPixelDimension <= 0) return 0;
  return (maximumPixelDimension / maximumDimension) * zoom;
}

export function createSharedScaleLayout(
  dimensions: readonly { id: string; dimensionMetres: number }[],
  width: number,
  height: number,
  layout: ComparisonLayout,
  zoom = 1,
): SharedScaleLayout {
  const scaleFactor = calculateSharedScaleFactor(
    dimensions.map(({ dimensionMetres }) => dimensionMetres),
    width,
    height,
    zoom,
  );
  const horizontalMargin = Math.min(42, width * 0.08);
  const gap = Math.min(18, width * 0.025) * Math.max(0, dimensions.length - 1);
  const slotWidth = dimensions.length > 0
    ? (width - 2 * horizontalMargin - gap) / dimensions.length
    : width;
  const baselineY = height - Math.min(56, height * 0.13);
  const visualDimensions = dimensions.map(({ id, dimensionMetres }, index) => {
    const dimensionPixels = dimensionMetres * scaleFactor;
    return {
      id,
      dimensionMetres,
      centerX: horizontalMargin + index * (slotWidth + (dimensions.length > 1 ? gap / (dimensions.length - 1) : 0)) + slotWidth / 2,
      centerY: layout === "baseline" ? baselineY - dimensionPixels / 2 : height / 2,
      dimensionPixels,
      visibleInPrimaryScale: dimensionPixels >= 1,
    };
  });
  return {
    width,
    height,
    scaleFactor,
    baselineY,
    dimensions: visualDimensions,
    belowResolutionIds: visualDimensions.filter(({ visibleInPrimaryScale }) => !visibleInPrimaryScale).map(({ id }) => id),
  };
}

export function formatMeasurement(dimensionMetres: number, unit: MeasurementUnit, significantDigits = 4): string {
  assertFinitePositive(dimensionMetres, "Dimension");
  const converted = dimensionMetres / metresPerUnit(unit);
  if (!Number.isFinite(converted)) throw new RangeError("Formatted dimension is outside the supported numeric range.");
  const value = converted.toPrecision(significantDigits);
  return `${Number(value).toLocaleString("en-US", { maximumSignificantDigits: significantDigits })} ${unit}`;
}

export function formatRatio(ratio: number, significantDigits = 3): string {
  assertFinitePositive(ratio, "Ratio");
  return ratio >= 1e7 || ratio < 1e-3
    ? ratio.toExponential(significantDigits - 1)
    : Number(ratio.toPrecision(significantDigits)).toLocaleString("en-US", { maximumSignificantDigits: significantDigits });
}
