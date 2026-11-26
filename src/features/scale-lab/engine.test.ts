import { describe, expect, it } from "vitest";
import { BUILT_IN_OBJECTS } from "./catalogue";
import { PLANETS, SUN } from "../../science/planets";
import {
  calculateSharedScaleFactor, compareDimensions, compareSphericalVolumes,
  convertMeasurement, createSharedScaleLayout, formatMeasurement, formatRatio,
  normalizeDimension, sphereVolumeM3,
} from "./engine";
import type { MeasurementUnit, ScaleObject } from "./types";

const objectById = (id: string): ScaleObject => {
  const object = BUILT_IN_OBJECTS.find((item) => item.id === id);
  if (!object) throw new Error(`Missing test object: ${id}`);
  return object;
};

describe("Scale Lab unit conversions", () => {
  it("converts every supported unit to metres and back without losing scale", () => {
    const factors: Record<MeasurementUnit, number> = {
      mm: 0.001, cm: 0.01, m: 1, km: 1_000, in: 0.0254, ft: 0.3048, mi: 1_609.344,
    };
    for (const [unit, metres] of Object.entries(factors) as [MeasurementUnit, number][]) {
      expect(convertMeasurement(1, unit, "m")).toBeCloseTo(metres, 12);
      expect(convertMeasurement(metres, "m", unit)).toBeCloseTo(1, 12);
    }
    expect(convertMeasurement(1, "in", "cm")).toBeCloseTo(2.54, 12);
    expect(normalizeDimension(1, "mi")).toBe(1_609.344);
  });

  it("rejects zero, negative, non-finite, missing, and out-of-range dimensions", () => {
    for (const invalid of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.MIN_VALUE]) {
      expect(() => normalizeDimension(invalid, "m")).toThrow(RangeError);
    }
    expect(() => normalizeDimension(1e308, "km")).toThrow(RangeError);
    expect(() => convertMeasurement(1, "m", "yd" as MeasurementUnit)).toThrow(RangeError);
    expect(() => compareDimensions(null as unknown as ScaleObject, objectById("earth"))).toThrow(RangeError);
  });
});

describe("dimensional comparisons", () => {
  it("calculates Earth-to-Moon ratios and differences from unrounded source dimensions", () => {
    const earth = objectById("earth");
    const moon = objectById("moon");
    const comparison = compareDimensions(earth, moon);
    const exactRatio = (earth.dimension * 1_000) / (moon.dimension * 1_000);
    expect(comparison.ratioAtoB).toBeCloseTo(exactRatio, 12);
    expect(comparison.absoluteDifferenceMetres).toBeCloseTo((earth.dimension - moon.dimension) * 1_000, 6);
    expect(comparison.percentageDifference).toBeCloseTo((exactRatio - 1) * 100, 8);
    expect(comparison.percentageSmaller).toBeCloseTo((1 - 1 / exactRatio) * 100, 8);
    expect(comparison.largerId).toBe("earth");
    expect(comparison.smallerId).toBe("moon");
  });

  it("handles mixed units and formats measurements and ratios clearly", () => {
    const height = { ...objectById("human-height"), dimension: 170, unit: "cm" as const };
    const car = objectById("car");
    expect(compareDimensions(car, height).ratioAtoB).toBeCloseTo(4.5 / 1.7, 12);
    expect(formatMeasurement(0.0254, "in")).toBe("1 in");
    expect(formatRatio(1e9)).toBe("1.00e+9");
    expect(formatRatio(1.23456)).toBe("1.23");
  });
});

describe("spherical volume estimates", () => {
  it("calculates sphere volume and the cube of the diameter ratio", () => {
    expect(sphereVolumeM3(1)).toBeCloseTo(Math.PI / 6, 12);
    const larger = { ...objectById("earth"), dimension: 4, unit: "m" as const };
    const smaller = { ...objectById("moon"), dimension: 1, unit: "m" as const };
    const comparison = compareSphericalVolumes(larger, smaller);
    expect(comparison.available).toBe(true);
    if (!comparison.available) return;
    expect(comparison.ratioAtoB).toBeCloseTo(64, 12);
  });

  it("requires explicit consent before estimating sphere volumes from linear dimensions", () => {
    const car = objectById("car");
    const earth = objectById("earth");
    expect(compareSphericalVolumes(car, earth).available).toBe(false);
    const estimate = compareSphericalVolumes(car, earth, true);
    expect(estimate.available).toBe(true);
    if (estimate.available) expect(estimate.approximate).toBe(true);
  });
});

describe("proportional visualization scaling", () => {
  it("uses one fit scale for every measurement and preserves their exact ratio", () => {
    const earth = objectById("earth").dimension * 1_000;
    const moon = objectById("moon").dimension * 1_000;
    const layout = createSharedScaleLayout([
      { id: "earth", dimensionMetres: earth },
      { id: "moon", dimensionMetres: moon },
    ], 800, 420, "baseline");
    expect(layout.dimensions[0].dimensionPixels / layout.dimensions[1].dimensionPixels).toBeCloseTo(earth / moon, 12);
    expect(layout.dimensions[0].dimensionPixels / earth).toBeCloseTo(layout.scaleFactor, 12);
    expect(layout.dimensions[1].dimensionPixels / moon).toBeCloseTo(layout.scaleFactor, 12);
    expect(layout.dimensions[0].dimensionPixels).toBeLessThan(800);
  });

  it("keeps sub-pixel objects below resolution instead of inflating them", () => {
    const scale = calculateSharedScaleFactor([1e10, 1e-6], 800, 420);
    const layout = createSharedScaleLayout([
      { id: "large", dimensionMetres: 1e10 },
      { id: "tiny", dimensionMetres: 1e-6 },
    ], 800, 420, "centered");
    expect(layout.dimensions[0].dimensionPixels / layout.dimensions[1].dimensionPixels).toBeCloseTo(1e16, 5);
    expect(layout.dimensions[1].visibleInPrimaryScale).toBe(false);
    expect(layout.belowResolutionIds).toEqual(["tiny"]);
    expect(layout.scaleFactor).toBe(scale);
    expect(calculateSharedScaleFactor([], 800, 420)).toBe(0);
  });

  it("zooms all dimensions by the same factor while preserving their ratio", () => {
    const dimensions = [
      { id: "large", dimensionMetres: 5_000 },
      { id: "small", dimensionMetres: 2 },
    ];
    const normal = createSharedScaleLayout(dimensions, 800, 420, "centered", 1);
    const zoomed = createSharedScaleLayout(dimensions, 800, 420, "centered", 2);
    expect(zoomed.scaleFactor).toBe(normal.scaleFactor * 2);
    expect(zoomed.dimensions[0].dimensionPixels / zoomed.dimensions[1].dimensionPixels)
      .toBeCloseTo(normal.dimensions[0].dimensionPixels / normal.dimensions[1].dimensionPixels, 12);
  });
});

describe("astronomy catalogue integration", () => {
  it("reuses the existing Sun and planetary diameters rather than copying them", () => {
    const earth = objectById("earth");
    const sun = objectById("sun");
    expect(earth.dimension).toBe(PLANETS.find((planet) => planet.id === "earth")!.physical.meanDiameterKm);
    expect(sun.dimension).toBe(SUN.physical.meanDiameterKm);
    expect(earth.source.url).toContain("nssdc.gsfc.nasa.gov");
    expect(objectById("moon").source.url).toContain("science.nasa.gov");
  });
});
