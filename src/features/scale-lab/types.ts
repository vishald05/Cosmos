export const MEASUREMENT_UNITS = ["mm", "cm", "m", "km", "in", "ft", "mi"] as const;
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

export function isMeasurementUnit(value: string): value is MeasurementUnit {
  return (MEASUREMENT_UNITS as readonly string[]).includes(value);
}

export const DIMENSION_TYPES = ["diameter", "height", "width", "length", "custom"] as const;
export type DimensionType = (typeof DIMENSION_TYPES)[number];

export function isDimensionType(value: string): value is DimensionType {
  return (DIMENSION_TYPES as readonly string[]).includes(value);
}

export type ScaleCategory = "star" | "planet" | "dwarf planet" | "moon" | "everyday" | "custom";
export type ScaleShape = "sphere" | "linear";

export interface ScaleObject {
  id: string;
  name: string;
  category: ScaleCategory;
  description: string;
  dimension: number;
  unit: MeasurementUnit;
  dimensionType: DimensionType;
  source: {
    label: string;
    url?: string;
  };
  builtIn: boolean;
  shape: ScaleShape;
  color: string;
  approximationNote?: string;
}

export interface NormalizedScaleObject extends ScaleObject {
  dimensionMetres: number;
}

export type ComparisonLayout = "baseline" | "centered";
