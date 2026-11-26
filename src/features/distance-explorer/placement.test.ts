import { describe, expect, it } from "vitest";
import {
  calculateInstantaneousSurfaceSeparation,
  calculateSurfaceGap,
} from "../../science/distance";
import { BUILT_IN_OBJECTS } from "../scale-lab/catalogue";
import { createCustomObject } from "../scale-lab/custom-objects";
import type { ScaleObject } from "../scale-lab/types";
import {
  calculateObjectPlacement,
  isPlacementObjectEligible,
} from "./placement";

const earth = BUILT_IN_OBJECTS.find(({ id }) => id === "earth")!;
const sphere = (diameterMetres: number): ScaleObject => ({
  ...earth,
  dimension: diameterMetres,
  unit: "m",
});

function separatedGap(gapMetres: number) {
  return calculateSurfaceGap(gapMetres + 2, 1, 1);
}

describe("spherical placement calculations", () => {
  it("calculates one and multiple complete objects without rounding the quotient", () => {
    const one = calculateObjectPlacement(separatedGap(8), sphere(5));
    const several = calculateObjectPlacement(separatedGap(14), sphere(4));

    expect(one).toMatchObject({
      status: "available",
      calculationType: "spherical-identical-object-placement",
      availableGapMetres: 8,
      intermediateDimensionMetres: 5,
      objectCount: 1n,
      remainingMetres: 3,
    });
    expect(several).toMatchObject({
      status: "available",
      availableGapMetres: 14,
      intermediateDimensionMetres: 4,
      objectCount: 3n,
      remainingMetres: 2,
    });
  });

  it("returns a valid zero-object result when no complete copy fits", () => {
    const result = calculateObjectPlacement(separatedGap(4), sphere(5));

    expect(result).toMatchObject({
      status: "available",
      objectCount: 0n,
      availableGapMetres: 4,
      remainingMetres: 4,
    });
  });

  it("handles exact fits, touching endpoints, and overlapping endpoints distinctly", () => {
    const exactFit = calculateObjectPlacement(separatedGap(10), sphere(5));
    const touching = calculateObjectPlacement(separatedGap(0), sphere(1));
    const overlap = calculateObjectPlacement(calculateSurfaceGap(1, 1, 1), sphere(1));

    expect(exactFit).toMatchObject({ status: "available", objectCount: 2n, remainingMetres: 0 });
    expect(touching).toMatchObject({ status: "available", endpointRelation: "touching", objectCount: 0n, remainingMetres: 0 });
    expect(overlap).toMatchObject({ status: "overlapping-endpoints", availableGapMetres: 0, objectCount: 0n, remainingMetres: 0, overlapMetres: 1 });
  });

  it("keeps counts exact beyond Number.MAX_SAFE_INTEGER and preserves the exact remainder", () => {
    const gap = 2 ** 100;
    const result = calculateObjectPlacement(separatedGap(gap), sphere(2 ** 40));

    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.objectCount).toBe(1n << 60n);
    expect(result.objectCount).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
    expect(result.remainingMetres).toBe(0);
  });

  it("returns endpoint and intermediate source identity with the original measurements", () => {
    const surface = calculateInstantaneousSurfaceSeparation("earth", "mars", 0);
    const result = calculateObjectPlacement(surface, earth);

    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.sources.endpoints?.map(({ id }) => id)).toEqual(["earth", "mars"]);
    expect(result.sources.intermediate).toMatchObject({
      id: "earth",
      name: "Earth",
      sourceType: "catalogue",
      measurementMode: "spherical-diameter",
    });
    expect(result.availableGapMetres).toBe(surface.status === "available" ? surface.availableSurfaceGapMetres : NaN);
  });
});

describe("placement measurement validation", () => {
  it("distinguishes invalid dimensions, missing endpoint radii, and unavailable positions", () => {
    const invalidObject = { ...sphere(1), dimension: Number.NaN };
    const missingRadii = calculateSurfaceGap(10, undefined, 1);
    const unavailableMoon = calculateInstantaneousSurfaceSeparation("earth", "moon", 0);

    expect(calculateObjectPlacement(separatedGap(10), invalidObject).status).toBe("invalid-dimension");
    expect(calculateObjectPlacement(missingRadii, sphere(1)).status).toBe("unavailable");
    expect(calculateObjectPlacement(unavailableMoon, sphere(1)).status).toBe("unavailable");
    expect(calculateObjectPlacement(calculateSurfaceGap(10, 0, 1), sphere(1)).status).toBe("invalid-input");
  });

  it("rejects spherical objects without diameter measurements", () => {
    const unsupportedObject = { ...earth, dimensionType: "height" as const };

    expect(calculateObjectPlacement(separatedGap(10), unsupportedObject)).toMatchObject({
      status: "unsupported-measurement-type",
    });
    expect(isPlacementObjectEligible(unsupportedObject)).toBe(false);
  });

  it("supports custom spherical diameters and labels custom linear measurements as one-dimensional estimates", () => {
    const customSphere = createCustomObject({
      name: "Custom sphere",
      description: "",
      dimension: 5,
      unit: "m",
      dimensionType: "diameter",
      shape: "sphere",
      color: "#cc9966",
    });
    const customLinear = createCustomObject({
      name: "Custom length",
      description: "",
      dimension: 4,
      unit: "m",
      dimensionType: "length",
      shape: "linear",
      color: "#6699cc",
    });

    expect(calculateObjectPlacement(separatedGap(12), customSphere)).toMatchObject({
      status: "available",
      calculationType: "spherical-identical-object-placement",
      objectCount: 2n,
      remainingMetres: 2,
    });
    expect(calculateObjectPlacement(separatedGap(9), customLinear)).toMatchObject({
      status: "available",
      calculationType: "linear-one-dimensional-placement-estimate",
      objectCount: 2n,
      remainingMetres: 1,
    });
    expect(isPlacementObjectEligible(customLinear)).toBe(true);
  });

  it("accepts every valid object in the shared catalogue", () => {
    expect(BUILT_IN_OBJECTS.every(isPlacementObjectEligible)).toBe(true);
  });
});
