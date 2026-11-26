import { describe, expect, it } from "vitest";
import { PLANETS } from "./planets";
import {
  calculateInstantaneousDistance,
  calculateInstantaneousDistances,
  calculateInstantaneousSurfaceSeparation,
  calculateSurfaceSeparationFromDistance,
  calculateLightTravelTime,
  calculatePositionDistance,
  calculateSurfaceGap,
  convertDistance,
  DISTANCE_UNITS,
  distanceToMetres,
  getCelestialPosition,
  METRES_PER_AU,
  METRES_PER_MILE,
  orbitalAverageDistanceUnavailable,
  SECONDS_PER_JULIAN_YEAR,
  SPEED_OF_LIGHT_METRES_PER_SECOND,
} from "./distance";
import { orbitalPosition } from "./orbit";
import { AU_IN_KM } from "./units";
import type { DistanceUnit } from "./distance";

const METRES_PER_UNIT: Record<DistanceUnit, number> = {
  m: 1,
  km: 1_000,
  mi: METRES_PER_MILE,
  AU: AU_IN_KM * 1_000,
};

describe("position geometry", () => {
  it("calculates Euclidean distance on a single axis and across all three axes", () => {
    const alongAxis = calculatePositionDistance(
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 0, z: 0 },
    );
    const acrossAxes = calculatePositionDistance(
      { x: 1, y: 2, z: 2 },
      { x: 4, y: 6, z: 2 },
    );
    expect(alongAxis).toEqual({ status: "available", distanceMetres: 3 * METRES_PER_AU, unit: "m" });
    expect(acrossAxes).toEqual({ status: "available", distanceMetres: 5 * METRES_PER_AU, unit: "m" });
  });

  it("preserves valid zero separation and small coordinate differences", () => {
    expect(calculatePositionDistance({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 }))
      .toEqual({ status: "available", distanceMetres: 0, unit: "m" });
    const small = calculatePositionDistance({ x: 0, y: 0, z: 0 }, { x: 1e-9, y: 0, z: 0 });
    expect(small.status).toBe("available");
    if (small.status === "available") expect(small.distanceMetres).toBeCloseTo(METRES_PER_AU * 1e-9, 8);
  });

  it("handles large coordinates without squaring overflow and rejects non-finite coordinates", () => {
    const large = calculatePositionDistance({ x: 0, y: 0, z: 0 }, { x: 1e9, y: 0, z: 0 });
    expect(large.status).toBe("available");
    if (large.status === "available") expect(large.distanceMetres).toBeCloseTo(1e9 * METRES_PER_AU, 3);
    expect(calculatePositionDistance(
      { x: Number.NaN, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    )).toMatchObject({ status: "invalid-input" });
  });
});

describe("distance unit conversions", () => {
  it("converts every supported unit pair and round-trips without display rounding", () => {
    const value = 12.3456789;
    for (const from of DISTANCE_UNITS) {
      expect(distanceToMetres(value, from)).toBeCloseTo(value * METRES_PER_UNIT[from], 8);
      for (const to of DISTANCE_UNITS) {
        const expected = value * METRES_PER_UNIT[from] / METRES_PER_UNIT[to];
        expect(convertDistance(value, from, to)).toBeCloseTo(expected, 10);
        expect(convertDistance(convertDistance(value, from, to), to, from)).toBeCloseTo(value, 10);
      }
    }
  });

  it("supports zero and very small distances while rejecting invalid values and units", () => {
    expect(convertDistance(0, "m", "AU")).toBe(0);
    expect(convertDistance(1e-6, "m", "km")).toBeCloseTo(1e-9, 20);
    expect(convertDistance(convertDistance(1e-6, "m", "km"), "km", "m")).toBeCloseTo(1e-6, 18);
    expect(() => convertDistance(-1, "m", "km")).toThrow(RangeError);
    expect(() => convertDistance(Number.NaN, "m", "km")).toThrow(RangeError);
    expect(() => convertDistance(1, "m", "parsec" as DistanceUnit)).toThrow(RangeError);
    expect(() => distanceToMetres(Number.MAX_VALUE, "mi")).toThrow(RangeError);
  });

  it("uses the existing AU constant and the standard mile definition", () => {
    expect(METRES_PER_AU).toBe(AU_IN_KM * 1_000);
    expect(METRES_PER_AU).toBe(149_597_870_700);
    expect(METRES_PER_MILE).toBe(1_609.344);
  });
});

describe("surface separation", () => {
  it("reports a positive gap, touching surfaces, and overlap distinctly", () => {
    expect(calculateSurfaceGap(1_000, 300, 200)).toMatchObject({
      status: "available",
      signedSurfaceGapMetres: 500,
      availableSurfaceGapMetres: 500,
      overlapMetres: 0,
      relation: "separated",
    });
    expect(calculateSurfaceGap(1_000, 500, 500)).toMatchObject({
      status: "available",
      signedSurfaceGapMetres: 0,
      availableSurfaceGapMetres: 0,
      overlapMetres: 0,
      relation: "touching",
    });
    expect(calculateSurfaceGap(700, 400, 400)).toMatchObject({
      status: "available",
      signedSurfaceGapMetres: -100,
      availableSurfaceGapMetres: 0,
      overlapMetres: 100,
      relation: "overlapping",
    });
  });

  it("reports missing radii as unavailable and invalid measurements as invalid", () => {
    expect(calculateSurfaceGap(10, undefined, 2)).toMatchObject({ status: "unavailable" });
    expect(calculateSurfaceGap(-1, 1, 1)).toMatchObject({ status: "invalid-input" });
    expect(calculateSurfaceGap(10, 0, 1)).toMatchObject({ status: "invalid-input" });
    expect(calculateSurfaceGap(10, Number.POSITIVE_INFINITY, 1)).toMatchObject({ status: "invalid-input" });
  });

  it("uses the physical mean radii from the existing profiles for live endpoint separation", () => {
    const result = calculateInstantaneousSurfaceSeparation("earth", "mars", 0);
    const center = calculateInstantaneousDistance("earth", "mars", 0);
    expect(calculateSurfaceSeparationFromDistance(center)).toEqual(result);
    expect(calculateSurfaceSeparationFromDistance(
      calculateInstantaneousDistance("earth", "moon", 0),
    )).toMatchObject({ status: "unavailable", reason: expect.stringContaining("lunar position") });
    expect(result.status).toBe("available");
    expect(center.status).toBe("available");
    if (result.status === "available" && center.status === "available") {
      const earth = PLANETS.find(({ id }) => id === "earth")!;
      const mars = PLANETS.find(({ id }) => id === "mars")!;
      expect(result.centerDistanceMetres).toBe(center.distanceMetres);
      expect(result.radiusAMetres).toBe(earth.physical.meanRadiusKm * 1_000);
      expect(result.radiusBMetres).toBe(mars.physical.meanRadiusKm * 1_000);
      expect(result.availableSurfaceGapMetres).toBe(
        center.distanceMetres - (earth.physical.meanRadiusKm + mars.physical.meanRadiusKm) * 1_000,
      );
    }
  });
});

describe("vacuum light travel time", () => {
  it("supports zero, one light-second, one AU, and Julian years", () => {
    expect(calculateLightTravelTime(0)).toMatchObject({ status: "available", seconds: 0, julianYears: 0 });
    const oneSecond = calculateLightTravelTime(SPEED_OF_LIGHT_METRES_PER_SECOND);
    expect(oneSecond).toMatchObject({ status: "available", seconds: 1, minutes: 1 / 60 });
    const oneAu = calculateLightTravelTime(METRES_PER_AU);
    expect(oneAu.status).toBe("available");
    if (oneAu.status === "available") expect(oneAu.seconds).toBeCloseTo(499.004783836, 8);
    const oneYear = calculateLightTravelTime(SPEED_OF_LIGHT_METRES_PER_SECOND * SECONDS_PER_JULIAN_YEAR);
    expect(oneYear.status).toBe("available");
    if (oneYear.status === "available") {
      expect(oneYear.julianYears).toBeCloseTo(1, 12);
      expect(oneYear.days).toBeCloseTo(365.25, 12);
    }
  });

  it("rejects negative and non-finite distances explicitly", () => {
    expect(calculateLightTravelTime(-1)).toMatchObject({ status: "invalid-input" });
    expect(calculateLightTravelTime(Number.POSITIVE_INFINITY)).toMatchObject({ status: "invalid-input" });
  });
});

describe("existing orbital position integration", () => {
  it("calculates a batch of segment pairs at one date while preserving unavailable pair results", () => {
    const results = calculateInstantaneousDistances([
      ["earth", "mars"],
      ["mars", "jupiter"],
      ["earth", "jupiter"],
      ["earth", "moon"],
    ], 0);

    expect(results).toHaveLength(4);
    expect(results.slice(0, 3).every((result) => (
      result.status === "available" && result.simulationTime.daysSinceJ2000Tdb === 0
    ))).toBe(true);
    expect(results[3]).toMatchObject({
      status: "unavailable",
      reason: expect.stringContaining("lunar position"),
    });
    expect(results[0]).toEqual(calculateInstantaneousDistance("earth", "mars", 0));
    expect(calculateInstantaneousDistances([], Number.NaN)).toEqual([]);
  });

  it("uses the existing JPL positions in a shared heliocentric ecliptic J2000 AU frame", () => {
    const result = calculateInstantaneousDistance("earth", "mars", 0);
    const earth = PLANETS.find(({ id }) => id === "earth")!;
    const mars = PLANETS.find(({ id }) => id === "mars")!;
    const earthPosition = orbitalPosition(earth.orbitalElements, 0);
    const marsPosition = orbitalPosition(mars.orbitalElements, 0);
    const expectedMetres = Math.hypot(
      (marsPosition.x - earthPosition.x) * METRES_PER_AU,
      (marsPosition.y - earthPosition.y) * METRES_PER_AU,
      (marsPosition.z - earthPosition.z) * METRES_PER_AU,
    );

    expect(result.status).toBe("available");
    if (result.status === "available") {
      expect(result.calculationType).toBe("instantaneous-center-to-center");
      expect(result.distanceMetres).toBe(expectedMetres);
      expect(result.distanceAu).toBeCloseTo(expectedMetres / METRES_PER_AU, 12);
      expect(result.unit).toBe("m");
      expect(result.referenceFrame).toBe("heliocentric ecliptic J2000");
      expect(result.simulationTime.daysSinceJ2000Tdb).toBe(0);
      expect(result.simulationTime.displayDateIso).toBe("2000-01-01T11:58:55.816Z");
      expect(result.sourceObjects.map(({ positionAu }) => positionAu)).toEqual([earthPosition, marsPosition]);
    }
  });

  it("uses the Sun as the heliocentric origin and preserves valid zero distance", () => {
    expect(getCelestialPosition("sun", 0)).toMatchObject({
      status: "available",
      positionAu: { x: 0, y: 0, z: 0 },
      positionSource: "heliocentric-origin",
    });
    expect(calculateInstantaneousDistance("earth", "earth", 0)).toMatchObject({
      status: "available",
      distanceMetres: 0,
      distanceAu: 0,
    });
  });

  it("changes with simulation time and records the same requested date for both positions", () => {
    const atEpoch = calculateInstantaneousDistance("earth", "mars", 0);
    const later = calculateInstantaneousDistance("earth", "mars", 100);
    expect(atEpoch.status).toBe("available");
    expect(later.status).toBe("available");
    if (atEpoch.status === "available" && later.status === "available") {
      expect(later.distanceMetres).not.toBe(atEpoch.distanceMetres);
      expect(later.simulationTime.daysSinceJ2000Tdb).toBe(100);
      expect(later.sourceObjects).toHaveLength(2);
    }
  });

  it("keeps the Moon and dimension-only custom objects explicitly unavailable", () => {
    expect(getCelestialPosition("moon", 0)).toMatchObject({ status: "unavailable", objectId: "moon" });
    expect(calculateInstantaneousDistance("earth", "moon", 0)).toMatchObject({ status: "unavailable" });
    expect(calculateInstantaneousDistance("earth", "custom-example", 0)).toMatchObject({
      status: "unavailable",
      reason: expect.stringContaining("dimensions only"),
    });
    expect(getCelestialPosition("unknown-body", 0)).toMatchObject({ status: "unavailable" });
  });

  it("distinguishes invalid times and dates outside the documented model range", () => {
    expect(calculateInstantaneousDistance("earth", "mars", Number.NaN))
      .toMatchObject({ status: "invalid-input" });
    expect(calculateInstantaneousDistance("earth", "mars", Number.MAX_VALUE))
      .toMatchObject({ status: "invalid-input" });
    expect(calculateInstantaneousDistance("earth", "mars", 100_000))
      .toMatchObject({ status: "unavailable", reason: expect.stringContaining("1800–2050") });
  });

  it("keeps orbital-average separation explicitly unsupported", () => {
    expect(orbitalAverageDistanceUnavailable("earth", "mars")).toMatchObject({
      status: "unavailable",
      measurementType: "orbital-average-distance",
      objectIds: ["earth", "mars"],
    });
  });
});
